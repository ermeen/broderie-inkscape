"""Broderie pour Inkscape : serveur du panneau, qui tourne en arrière-plan.

Inkscape n'est jamais bloqué : l'extension « Panneau de broderie » ne fait qu'un aller-retour
rapide (/api/sync) qui
  1. envoie au panneau le dessin actuel d'Inkscape et la sélection ;
  2. récupère les modifications faites dans le panneau depuis le dernier aller-retour,
     appliquées à ce dessin (Inkscape les reçoit comme une extension ordinaire, Cmd+Z les annule).
Écoute uniquement 127.0.0.1. S'arrête seul après une longue période sans panneau ouvert.
"""
import json
import os
import re
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from lxml import etree

from . import modele as M
from . import moteur as E
from . import systeme as S

UI = os.path.join(M.ICI, "ui")
try:
    with open(os.path.join(M.ICI, "..", "VERSION"), encoding="utf-8") as _f:
        VERSION_PANNEAU = _f.read().strip()
except OSError:
    VERSION_PANNEAU = "?"
DEMARRAGE = time.time()


def perime():
    """Le code du panneau a été mis à jour depuis le démarrage de ce serveur."""
    try:
        return any(os.path.getmtime(os.path.join(M.ICI, f)) > DEMARRAGE
                   for f in os.listdir(M.ICI) if f.endswith(".py"))
    except OSError:
        return False
PORT = int(os.environ.get("BRODERIE_PORT") or 47811)
SESSION = os.path.expanduser(os.environ.get("BRODERIE_SESSION") or
                             os.path.join(S.donnees(), "session-%d.json" % PORT))
INACTIF = float(os.environ.get("BRODERIE_INACTIF") or 3600)    # secondes sans panneau ni Inkscape → arrêt


def _lire(svg):
    return etree.ElementTree(etree.fromstring(svg.encode("utf-8") if isinstance(svg, str) else svg,
                                              etree.XMLParser(huge_tree=True)))


CADRES = os.path.join(S.donnees(), "cadres.json")
CADRES_DEFAUT = [{"nom": "100 × 100", "largeur": 100, "hauteur": 100}, {"nom": "130 × 180", "largeur": 130, "hauteur": 180},
                 {"nom": "160 × 260", "largeur": 160, "hauteur": 260}, {"nom": "200 × 200", "largeur": 200, "hauteur": 200},
                 {"nom": "200 × 300", "largeur": 200, "hauteur": 300}, {"nom": "240 × 150", "largeur": 240, "hauteur": 150},
                 {"nom": "360 × 200", "largeur": 360, "hauteur": 200}]


def lire_cadres():
    try:
        with open(CADRES, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return [dict(c) for c in CADRES_DEFAUT]


# réglages favoris : ensembles de réglages nommés, par type de forme, réutilisables dans tous les dessins
FAVORIS = os.path.join(S.donnees(), "favoris.json")


def lire_favoris():
    try:
        with open(FAVORIS, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return []


def ecrire_favoris(favoris):
    propres = [{"nom": str(f.get("nom") or "Favori")[:60], "type": str(f.get("type") or ""), "valeurs": dict(f.get("valeurs") or {})}
               for f in favoris if isinstance(f, dict) and f.get("type")]
    os.makedirs(os.path.dirname(FAVORIS), exist_ok=True)
    with open(FAVORIS, "w", encoding="utf-8") as f:
        json.dump(propres, f, ensure_ascii=False, indent=1)
    return propres


def ecrire_cadres(cadres):
    propres = []
    for c in cadres:
        try:
            l, h = float(c["largeur"]), float(c["hauteur"])
        except (KeyError, TypeError, ValueError):
            continue
        if l > 0 and h > 0:
            propres.append({"nom": str(c.get("nom") or "%g × %g" % (l, h))[:60], "largeur": l, "hauteur": h})
    os.makedirs(os.path.dirname(CADRES), exist_ok=True)
    with open(CADRES, "w", encoding="utf-8") as f:
        json.dump(propres, f, ensure_ascii=False, indent=1)
    return propres


def signature(doc):
    """Ce qui compte pour la broderie : formes, styles, transformations et réglages, par objet."""
    sig = []
    for el in doc.getroot().iter():
        if not isinstance(el.tag, str) or not el.get("id"):
            continue
        if M.local(el) in M.FORMES or M.local(el) == "g":
            sig.append((el.get("id"), el.tag, tuple(sorted((k, v) for k, v in el.attrib.items()
                                                            if not k.startswith("{http://www.inkscape.org") and
                                                            not k.startswith("{http://sodipodi")))))
    return sig


class Session:
    def __init__(self):
        self.document = None              # dessin vu par le panneau (avec les modifications en attente)
        self.base = None                  # signature du dessin après le dernier aller-retour
        self.recu = None                  # dessin tel qu'Inkscape l'a envoyé la dernière fois
        self.ids = []
        self.nom = "dessin"
        self.attente = []                 # modifications pas encore renvoyées à Inkscape
        self.reserve = {}                 # modifications en attente d'autres dessins (nom du dessin → liste)
        self.version = 0                  # change à chaque nouveau dessin reçu d'Inkscape
        self.verrou = threading.RLock()
        self.journal = []
        self.vu = 0.0                     # dernier signe de vie du panneau
        self.tache = None                 # commande Ink/Stitch en cours (fenêtre éventuelle)
        self.actif = time.time()

    # --- sauvegarde : les modifications en attente survivent à un redémarrage du panneau ---------
    def sauver(self):
        try:
            os.makedirs(os.path.dirname(SESSION), exist_ok=True)
            d = {"recu": self.recu, "ids": self.ids, "nom": self.nom, "attente": self.attente, "reserve": self.reserve,
                 "document": etree.tostring(self.document.getroot(), encoding="unicode") if self.document is not None else None}
            with open(SESSION + ".tmp", "w", encoding="utf-8") as f:
                json.dump(d, f)
            os.replace(SESSION + ".tmp", SESSION)
        except (OSError, TypeError, ValueError) as e:
            self.log("Sauvegarde impossible : %s" % e)

    def restaurer(self):
        try:
            with open(SESSION, encoding="utf-8") as f:
                d = json.load(f)
        except (OSError, ValueError):
            return
        if d.get("document"):
            self.document = _lire(d["document"])
            self.recu = d.get("recu")
            self.base = signature(_lire(d["recu"])) if d.get("recu") else None
            self.ids, self.nom = d.get("ids") or [], d.get("nom") or "dessin"
            self.attente = [tuple(op) for op in d.get("attente") or []]
            self.reserve = {k: [tuple(op) for op in v] for k, v in (d.get("reserve") or {}).items()}
            self.version = 1

    # --- état -------------------------------------------------------------
    def etat(self):
        if self.document is None:
            return {"objets": [], "selection": [], "nom": self.nom, "attente": 0, "version": self.version,
                    "version_panneau": VERSION_PANNEAU, "raccourci": S.RACCOURCI, "mac": S.MAC,
                    "moteur": {"chemin": E.binaire(), "version": E.version()}, "commandes": [], "formats": [],
                    "journal": self.journal[-20:], "sans_dessin": True}
        objs = M.objets(self.document, self.ids, masques=True)
        if self.ids and not objs:                       # sélection sans objet brodable : tout le document
            objs = M.objets(self.document, masques=True)
        cmds = M.commandes()
        sorties = sorted({c["format"] for c in M.CATALOGUE["commandes"] if c["type"] == "output" and c["format"]})
        total = len(M.objets(self.document, masques=True)) if self.ids else len(objs)
        return {"objets": [M.decrire(o) for o in objs], "selection": self.ids, "nom": self.nom, "total": total, "synchro": getattr(self, "synchro", 0),
                "attente": len(self.attente), "version": self.version,
                "reserve": {k: len(v) for k, v in self.reserve.items()},
                "version_panneau": VERSION_PANNEAU, "raccourci": S.RACCOURCI, "mac": S.MAC,
                "ancien": E.ancien(self.document), "bati": M.reglages_bati(self.document),
                "origine": M.origine_active(self.document), "placees": M.commandes_placees(self.document),
                "moteur": {"chemin": E.binaire(), "version": E.version()},
                "commandes": cmds, "formats": sorties, "journal": self.journal[-20:]}

    def log(self, msg):
        self.journal.append(time.strftime("%H:%M ") + msg)

    # --- aller-retour avec Inkscape -----------------------------------------
    def sync(self, d):
        """Dessin actuel d'Inkscape → applique les modifications en attente → dessin à renvoyer (ou None)."""
        with self.verrou:
            self.actif = self.synchro = time.time()
            recu = d["svg"]
            doc = _lire(recu)
            E.versionner(doc)
            renvoi = None
            # les modifications en attente appartiennent à un dessin : changement de dessin → mises de côté
            nom = d.get("nom") or self.nom
            if nom != self.nom:
                if self.attente:
                    self.reserve[self.nom] = self.attente
                    self.log("%d modification(s) gardée(s) pour « %s » : elles seront appliquées quand ce dessin "
                             "sera de nouveau ouvert." % (len(self.attente), self.nom))
                self.attente = self.reserve.pop(nom, [])
                if self.attente:
                    self.base = None              # rejouées sur le dessin rouvert
                    self.log("%d modification(s) en attente pour « %s » appliquées." % (len(self.attente), nom))
            if self.attente:
                commandes = [op for op in self.attente if op[0] == "commande"]
                if commandes and self.base is not None and signature(doc) == self.base and self.document is not None:
                    # dessin inchangé dans Inkscape : on renvoie tel quel le résultat du panneau
                    doc = self.document
                else:
                    for op in self.attente:
                        self._rejouer(doc, op)
                    if commandes:
                        self.log("Le dessin a changé dans Inkscape : %d commande(s) Ink/Stitch à refaire "
                                 "dans le panneau." % len(commandes))
                renvoi = etree.tostring(doc.getroot(), encoding="unicode")
                self.log("%d modification(s) appliquée(s) dans Inkscape." % len(self.attente))
                self.attente = []
            self.recu = renvoi if renvoi is not None else recu
            self.document = doc
            self.base = signature(doc)
            self.ids = [i for i in d.get("ids") or [] if i]
            self.nom = d.get("nom") or self.nom
            self.version += 1
            return {"svg": renvoi, "panneau_ouvert": time.time() - self.vu < 6,
                    "perime": perime() and not self.attente and not (self.tache and not self.tache.get("fini"))}

    def _rejouer(self, doc, op):
        if op[0] == "visible":
            M.montrer(doc, op[1], op[2])
            return
        if op[0] == "origine":
            M.placer_origine(doc, op[1], op[2])
            return
        if op[0] == "attacher":                        # départ / fin d'un remplissage : groupe tel que posé dans le panneau
            M.poser_commande(doc, *op[1:])
            return
        if op[0] == "detacher":
            M.retirer_commande(doc, op[1], op[2])
            return
        if op[0] == "broder_ailleurs":                 # objets mis dans un calque « suite » avant / après un autre
            M.broder_ailleurs(doc, op[1], op[2], op[3], op[4])
            return
        if op[0] == "applique":
            M.creer_applique(doc, op[1], op[2])
            return
        if op[0] == "ordre_couleurs":
            M.ordre_par_couleur(doc)
            return
        if op[0] == "lettres":
            M.regler_lettres(doc, *op[1:])
            return
        if op[0] == "fils":
            M.remplacer_couleurs(doc, op[1])
            return
        if op[0] == "bati":
            M.appliquer_bati(doc, *op[1:])
            return
        if op[0] == "bati_couleur":
            M.recolorer_bati(doc)
            return
        if op[0] == "placer":
            M.placer(doc, op[1], op[2], op[3])
            return
        if op[0] == "cadre":
            M.appliquer_cadre(doc, *op[1:])
            return
        if op[0] == "version":
            E.marquer_a_jour(doc)
            return
        el = M.par_id(doc, op[1]) if op[0] != "commande" else None
        if op[0] != "commande" and el is None:
            return                                     # objet supprimé dans Inkscape entre-temps
        if op[0] == "params":
            M.ecrire(el, op[2])
        elif op[0] == "couleur":
            M.changer_couleur(el, op[2], op[3])
        elif op[0] == "ordre":
            M.deplacer(el, op[2])

    def _suivre_bati(self):
        """Le bâti garde le fil de la première forme brodée (couleur ou ordre changés)."""
        if M.recolorer_bati(self.document):
            self.attente.append(("bati_couleur",))

    # --- actions du panneau -------------------------------------------------
    def action(self, nom, d):
        r = self._action(nom, d)
        if nom in ("params", "couleur", "ordre", "abandonner", "sync", "lettrage", "assembler", "marquer_a_jour", "cadre", "placer", "visible", "appliquer_fils", "bati", "figer", "lettres", "applique"):
            self.sauver()
        return r

    def _action(self, nom, d):
        if nom == "envoyer":                           # bouton « Envoyer à Inkscape » (sans verrou : Inkscape va appeler /sync)
            if not S.MAC:                              # cliquer le menu d'Inkscape : seulement sur macOS
                return {"ok": False, "message": "Appuyez sur %s dans Inkscape." % S.RACCOURCI}
            from . import fenetre
            ok, msg = fenetre.envoyer_a_inkscape()
            return {"ok": ok, "message": msg}
        if nom == "present":                           # signe de vie (sans verrou : jamais bloqué)
            self.vu = self.actif = time.time()
            return {"version": self.version, "attente": len(self.attente), "tache": self.tache}
        if nom == "bobines":
            return self._bobines(d)
        if nom == "verifier":
            return self._verifier(d)
        if nom == "origine":                           # motif centré (défaut) ou placé comme sur la feuille
            return self._origine(d)
        if nom == "position":                          # point de départ / de fin d'un remplissage
            return self._position(d)
        if nom == "relier_sauts":                      # sauts courts → points droits (Ink/Stitch « Saut en trait »)
            return self._relier_sauts(d)
        if nom == "ouvrir_machine":                    # fichier de broderie → dessin Inkscape, ouvert dans Inkscape
            return self._ouvrir_machine(d)
        if nom == "optimiser":
            return self._optimiser(d)
        if nom == "couper_sauts":
            return self._couper_sauts(d)
        if nom == "lettres_resume":
            with self.verrou:
                return {"lettres": M.resume_lettres(self.document, d["id"]) if self.document is not None else None}
        if nom == "nuancier":
            chemin = M.palettes(E.ressources()).get(d.get("marque") or "")
            return {"fils": M.lire_palette(chemin) if chemin else []}
        if nom == "apercu_texte":
            return self._apercu_texte(d)
        if nom in ("apercu", "points", "densite"):     # calculs longs : sur une copie, sans bloquer le panneau
            with self.verrou:
                if self.document is None:
                    raise ValueError("Aucun dessin : appuyez sur ⌘⌥B dans Inkscape.")
                copie = _lire(etree.tostring(self.document.getroot()))
            if nom == "densite":
                svg, err = E.densite(copie, d.get("ids") or None, d.get("seuils"))
                return {"svg": svg, "erreur": None if svg else _message(err)}
            if nom == "apercu":
                svg, err = E.apercu(copie, d.get("ids") or None, d.get("mode") or "points", d.get("options") or {})
                return {"svg": svg, "erreur": None if svg else (err or "")[-2000:]}
            r, err = E.points(copie, d.get("ids") or None)
            if r:
                try:
                    r["page"] = M.page_et_centre(copie, d.get("ids") or None)
                except Exception:
                    r["page"] = None
            return r or {"erreur": _message(err) or "Aucun point."}
        with self.verrou:
            if nom == "etat":
                return self.etat()
            if nom == "schema":
                return M.schema()
            if nom == "sync":
                return self.sync(d)
            if self.document is None:
                raise ValueError("Aucun dessin : lancez Extensions › Broderie › Panneau de broderie dans Inkscape.")
            if nom == "broder_ailleurs":               # broder des objets avant / après un autre calque
                ids, apres = [i for i in d.get("ids") or [] if M.par_id(self.document, i) is not None], bool(d.get("apres", True))
                nid = M.broder_ailleurs(self.document, ids, d["cible"], apres)
                if not nid:
                    raise ValueError("Calque ou objets introuvables : appuyez sur %s dans Inkscape." % S.RACCOURCI)
                self.attente.append(("broder_ailleurs", ids, d["cible"], apres, nid))
                self.version += 1
                self.sauver()
                return self.etat()
            if nom == "tout_le_dessin":                # liste limitée à la sélection d'Inkscape → tout le dessin
                self.ids = []
                self.version += 1
                return self.etat()
            if nom == "applique":                      # assistant appliqué : placement, fixation, bordure satin
                ident = M.creer_applique(self.document, d["id"], float(d.get("largeur") or 3))
                if not ident:
                    raise ValueError("Choisissez une forme fermée (rectangle, cercle, chemin…).")
                self.attente.append(("applique", d["id"], float(d.get("largeur") or 3)))
                self.version += 1
                return {"id": ident, "etat": self.etat()}
            if nom == "lettres":                       # réglages des lettres d'un texte (par type de forme)
                lettre = d.get("lettre")
                if not M.regler_lettres(self.document, d["id"], d["type"], d.get("valeurs") or {}, lettre):
                    raise ValueError("Texte introuvable.")
                self.attente.append(("lettres", d["id"], d["type"], d.get("valeurs") or {}, lettre))
                self.version += 1
                return {"etat": self.etat(), "lettres": M.resume_lettres(self.document, d["id"])}
            if nom == "params":
                M.ecrire(M.par_id(self.document, d["id"]), d.get("valeurs", {}))
                self.attente.append(("params", d["id"], d.get("valeurs", {})))
                return self.etat()
            if nom == "bati":                          # faufilage autour du motif (ajouté, recalculé ou retiré)
                op = ("bati", bool(d.get("actif")), float(d.get("ecart", 10)), float(d.get("longueur", 5)),
                      float(d.get("arrondi", 6)), d.get("cadre_largeur"), d.get("cadre_hauteur"))
                if not M.appliquer_bati(self.document, *op[1:]):
                    raise ValueError("Aucun objet brodé autour duquel placer le bâti.")
                self.attente.append(op)
                self.version += 1
                return self.etat()
            if nom == "appliquer_fils":                # couleurs exactes des bobines choisies
                corr = {a: n for a, n in (d.get("correspondances") or {}).items() if M.hex6(a) != M.hex6(n)}
                if corr and M.remplacer_couleurs(self.document, corr):
                    self.attente.append(("fils", corr))
                    self.version += 1
                return self.etat()
            if nom == "couleur":
                M.changer_couleur(M.par_id(self.document, d["id"]), d["quoi"], d["valeur"])
                self.attente.append(("couleur", d["id"], d["quoi"], d["valeur"]))
                self._suivre_bati()
                return self.etat()
            if nom == "ordre":
                if M.deplacer(M.par_id(self.document, d["id"]), int(d["sens"])):
                    self.attente.append(("ordre", d["id"], int(d["sens"])))
                    self._suivre_bati()
                return self.etat()
            if nom == "abandonner":                    # oublie les modifications en attente
                if self.recu is not None:
                    self.document = _lire(self.recu)
                self.attente = []
                self.version += 1
                return self.etat()
            if nom == "apercu":
                svg, err = E.apercu(self.document, d.get("ids") or None, d.get("mode") or "points", d.get("options") or {})
                return {"svg": svg, "erreur": None if svg else (err or "")[-2000:]}
            if nom == "simulateur":
                E.executer(self.document, "simulator", d.get("ids") or None, attendre=False)
                return {"ok": True}
            if nom == "commande":
                return self._commande(d)
            if nom == "fenetre":                       # largeur de la fenêtre du panneau (bouton ⇆)
                if not S.MAC:                          # ailleurs, la fenêtre se règle à la main
                    return {"ok": False, "message": "Élargissez la fenêtre du navigateur."}
                from . import fenetre
                ok, msg = fenetre.placer("http://127.0.0.1:%d" % PORT, int(d.get("largeur") or 440), forcer=True)
                return {"ok": ok, "message": msg}
            if nom == "cadre":                        # le cadre devient la page d'Inkscape, motif centré
                op = ("cadre", float(d["largeur"]), float(d["hauteur"]), bool(d.get("centrer", True)), bool(d.get("page", True)))
                M.appliquer_cadre(self.document, *op[1:])
                self.attente.append(op)
                self.version += 1
                self.log("Cadre %g × %g mm appliqué" % (op[1], op[2]))
                return self.etat()
            if nom == "favoris":                      # réglages favoris (liste personnelle)
                return {"favoris": lire_favoris()}
            if nom == "favoris_ecrire":
                return {"favoris": ecrire_favoris(d.get("favoris") or [])}
            if nom == "cadres":                       # cadres de la brodeuse (liste personnelle)
                return {"cadres": lire_cadres()}
            if nom == "cadres_ecrire":
                return {"cadres": ecrire_cadres(d.get("cadres") or [])}
            if nom == "marquer_a_jour":               # « Ce dessin est récent »
                E.marquer_a_jour(self.document)
                self.attente.append(("version",))
                self.version += 1
                return self.etat()
            if nom == "traverses":
                return {"ids": M.traverses_possibles(self.document, d["id"])}
            if nom == "assembler":
                ident = M.assembler_satin(self.document, d["ids"])
                self.attente.append(("commande", "assembler_satin"))
                self.version += 1
                self.log("Colonne satin assemblée")
                return {"id": ident, "etat": self.etat()}
            if nom == "visible":                      # œil : objet ou calque brodé ou non
                if M.montrer(self.document, d["id"], bool(d.get("visible"))):
                    self.attente.append(("visible", d["id"], bool(d.get("visible"))))
                    self._suivre_bati()
                    self.version += 1
                return self.etat()
            if nom == "placer":                       # glisser-déposer dans la liste (objets et calques)
                # plusieurs objets : posés un à un dans un ordre qui garde leur ordre de couture
                ordre = {e.get("id"): k for k, e in enumerate(self.document.getroot().iter()) if isinstance(e.tag, str)}
                ids = sorted([i for i in (d.get("ids") or [d["id"]]) if i != d["cible"]], key=lambda i: ordre.get(i, 0))
                cible, apres = d["cible"], bool(d.get("apres"))
                dans = M.par_id(self.document, cible) is not None and \
                    M.par_id(self.document, cible).get("{%s}groupmode" % M.INKSCAPE_NS) == "layer" and len(ids) and \
                    M.par_id(self.document, ids[0]) is not None and M.par_id(self.document, ids[0]).get("{%s}groupmode" % M.INKSCAPE_NS) != "layer"
                for i in (reversed(ids) if apres or dans else ids):
                    if M.placer(self.document, i, cible, apres):
                        self.attente.append(("placer", i, cible, apres))
                self._suivre_bati()
                self.version += 1
                return self.etat()
            if nom == "contours":                     # contours de tous les objets : clic dans l'aperçu
                return {"objets": [{"id": o["id"], "svg": M.contour_svg(self.document, o["id"])}
                                   for o in self.etat()["objets"]]}
            if nom == "contour":
                return {"svg": M.contour_svg(self.document, d["id"]) if self.document is not None else None}
            if nom == "points":
                r, err = E.points(self.document, d.get("ids") or None)
                if r:
                    try:
                        r["page"] = M.page_et_centre(self.document, d.get("ids") or None)
                    except Exception:
                        r["page"] = None
                return r or {"erreur": _message(err) or "Aucun point."}
            if nom == "polices":
                return {"polices": E.polices()}
            if nom == "lettrage":
                return self._lettrage(d)
            if nom == "figer":
                return self._figer(d)
            if nom == "choisir":
                return {"chemin": S.choisir(d.get("mode") or "file")}
            if nom == "quitter":
                threading.Timer(0.3, os._exit, (0,)).start()
                return {"ok": True}
            raise ValueError("action inconnue : %s" % nom)

    def _guide(self, doc, d):
        """Texte sur une courbe dessinée dans Inkscape : met son tracé (repère du dessin) dans d["arc"]["trace"]."""
        arc = d.get("arc") or {}
        if not arc.get("chemin"):
            return None
        arc["trace"] = M.trace_absolu(doc, arc["chemin"])
        if not arc["trace"]:
            raise ValueError("Cette courbe est introuvable ou n'est pas un tracé : synchronisez, puis choisissez-en une autre.")
        return arc["chemin"]

    def _texte(self, doc, d):
        """Fabrique un texte brodé dans doc (lettrage par lots d'Ink/Stitch), éventuellement courbé en arc
        (tracé guide provisoire + « lettrage le long d'un chemin », puis guide retiré). Renvoie (doc, groupe)."""
        avant = {el.get("id") for el in doc.getroot().iter() if isinstance(el.tag, str) and el.get("id")}
        res, err = E.lettrage(doc, d.get("params") or {})
        if res is None:
            raise ValueError(_message(err) or "Lettrage impossible.")
        groupes = [g for g in res.getroot().iter("{http://www.w3.org/2000/svg}g")
                   if g.get("{%s}lettering" % M.INKSTITCH_NS) is not None and g.get("id") not in avant]
        if not groupes:
            raise ValueError("Lettrage impossible.")
        g = groupes[-1]
        if not g.get("id"):
            g.set("id", "lettrage_%d" % int(time.time() * 1000))
        arc = d.get("arc") or {}
        courbure = float(arc.get("courbure") or 0)
        trace = arc.get("trace")                            # courbe dessinée dans Inkscape (spline, spirale…)
        if trace or abs(courbure) >= 1:
            b = M.emprise(res, [g.get("id")])
            if b:
                guide = etree.SubElement(g.getparent(), "{%s}path" % M.SVG_NS)
                guide.set("id", "guide_arc_%d" % int(time.time() * 1000))
                guide.set("style", "fill:none;stroke:#000000;stroke-width:0.1")
                guide.set("d", trace or M.chemin_arc(b[2] - b[0], (b[0] + b[2]) / 2, b[3], courbure))
                if trace:
                    options = {"text-position": arc.get("position") or "center", "vertical-alignment": "baseline"}
                else:
                    # « stretch » répartit les lettres sur tout l'arc (essayé : « center » les décale) ; vers le bas,
                    # les lettres pendent sous l'arc (sinon elles s'entassent dans le creux)
                    options = {"text-position": "stretch", "vertical-alignment": "baseline" if courbure > 0 else "bottom"}
                code, out, err = E.executer(res, "lettering_along_path", [g.get("id"), guide.get("id")], options, delai=120)
                courbe = E.document_modifie(out)
                if courbe is None:
                    raise ValueError(_message(err) or "Impossible de courber le texte.")
                res = courbe
                vieux = M.par_id(res, guide.get("id"))
                if vieux is not None:
                    vieux.getparent().remove(vieux)
                g = M.par_id(res, g.get("id"))
            if trace:                                       # retrouvés quand on modifie le texte
                g.set("data-broderie-trace", arc.get("chemin") or "")
                g.set("data-broderie-position", options["text-position"])
            else:
                g.set("data-broderie-arc", str(courbure))
        return res, g

    def _lettrage(self, d):
        """Ajoute (ou remplace) un texte brodé, sans fenêtre d'Ink/Stitch."""
        doc = _lire(etree.tostring(self.document.getroot()))
        chemin = self._guide(doc, d)
        ancien = M.par_id(doc, d["remplacer"]) if d.get("remplacer") else None
        place = M.emprise(doc, [ancien.get("id")]) if ancien is not None else None
        # réglages des lettres gardés sur l'ancien texte : réappliqués au nouveau (sauf « revenir à la police »)
        gardes = M.reglages_lettres(ancien) if ancien is not None and not d.get("sans_reglages") else None
        if ancien is not None:
            ancien.getparent().remove(ancien)
        res, g = self._texte(doc, d)
        b = M.emprise(res, [g.get("id")]) if place else None
        if place and b and not chemin:                       # le texte modifié reste centré au même endroit
            dx = (place[0] + place[2]) / 2 - (b[0] + b[2]) / 2
            dy = (place[1] + place[3]) / 2 - (b[1] + b[3]) / 2
            g.set("transform", ("translate(%g,%g) %s" % (dx, dy, g.get("transform") or "")).strip())
        if chemin:                                           # la courbe guide ne se brode pas (œil fermé)
            M.montrer(res, chemin, False)
        M.reappliquer_lettres(g, gardes)
        self.document = res
        self.ids = []                      # on garde tout le dessin dans la liste ; le panneau choisit le texte
        self.version += 1
        self.attente.append(("commande", "batch_lettering"))
        self.log("Texte brodé ajouté")
        return {"id": g.get("id")}

    @staticmethod
    def _sauts_longs(doc, boites, seuil):
        """Sauts plus longs que seuil (mm) sans coupe, hors changement de fil : [(objet de départ, longueur mm)]."""
        import math
        r, err = E.points(doc)
        out = []
        if not (r and r["points"] and boites):
            return out
        pts, mm = r["points"], M.mm_par_unite(doc)
        xs = [p[0] for p in pts if p[2] == "STITCH"] or [0]
        ys = [p[1] for p in pts if p[2] == "STITCH"] or [0]
        cpx, cpy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        cbx = (min(b[0] for b in boites.values()) + max(b[2] for b in boites.values())) / 2
        cby = (min(b[1] for b in boites.values()) + max(b[3] for b in boites.values())) / 2
        dessin = lambda x, y: (cbx + (x - cpx) / 10 / mm, cby + (y - cpy) / 10 / mm)      # points (0,1 mm, centrés) → dessin
        dernier, depart, coupe, apres_couleur = None, None, False, False
        for x, y, c in pts:
            if c == "STITCH":
                if depart is not None and not coupe and not apres_couleur:
                    long_mm = math.dist(depart, (x, y)) / 10
                    if long_mm > seuil:
                        out.append((M._objet_proche(doc, *dessin(*depart), boites), long_mm))
                dernier, depart, coupe, apres_couleur = (x, y), None, False, False
            elif c == "JUMP":
                if depart is None:
                    depart = dernier
            elif c == "TRIM":
                coupe = True
            elif c == "COLOR_CHANGE":
                apres_couleur = True
        return out

    def _optimiser(self, d):
        """Regrouper les couleurs (calque par calque) : gain calculé par Ink/Stitch avant d'appliquer."""
        with self.verrou:
            if self.document is None:
                raise ValueError("Aucun dessin : appuyez sur ⌘⌥B dans Inkscape.")
            avant = _lire(etree.tostring(self.document.getroot()))
        apres = _lire(etree.tostring(avant.getroot()))
        if not M.ordre_par_couleur(apres):
            return {"change": False}
        r1, e1 = E.points(avant)
        r2, e2 = E.points(apres)
        if not (r1 and r2):
            raise ValueError(_message(e1 or e2) or "Calcul impossible.")
        res = {"change": True, "avant": M.resume_couture(r1["points"]), "apres": M.resume_couture(r2["points"])}
        if d.get("appliquer"):
            with self.verrou:
                M.ordre_par_couleur(self.document)
                self.attente.append(("ordre_couleurs",))
                self._suivre_bati()
                self.version += 1
                self.sauver()
                res["etat"] = self.etat()
        return res

    def _couper_sauts(self, d):
        """Ajoute une coupe après chaque objet suivi d'un saut plus long que le seuil (mm)."""
        with self.verrou:
            if self.document is None:
                raise ValueError("Aucun dessin : appuyez sur ⌘⌥B dans Inkscape.")
            doc = _lire(etree.tostring(self.document.getroot()))
        idents = []
        for ident, long_mm in self._sauts_longs(doc, M.boites_objets(doc), float(d.get("seuil") or 5)):
            if ident and ident not in idents:
                idents.append(ident)
        with self.verrou:
            for ident in idents:
                el = M.par_id(self.document, ident)
                if el is not None:
                    M.ecrire(el, {"trim_after": True})
                    self.attente.append(("params", ident, {"trim_after": True}))
            if idents:
                self.version += 1
                self.sauver()
            return {"coupes": len(idents), "etat": self.etat()}

    def _origine(self, d):
        actif = bool(d.get("actif"))
        with self.verrou:
            if self.document is None:
                raise ValueError("Aucun dessin : appuyez sur ⌘⌥B dans Inkscape.")
            sym = M.symbole_origine(self.document)
            copie = None if sym or not actif else _lire(etree.tostring(self.document.getroot()))
        if copie is not None:                           # le symbole d'origine vient d'Ink/Stitch (commande globale)
            code, out, err = E.executer(copie, "global_commands", None, {"origin": True, "stop_position": False})
            res = E.document_modifie(out)
            sym = M.symbole_origine(res) if res is not None else None
            if not sym:
                raise ValueError(_message(err) or "Ink/Stitch n'a pas fourni le point d'origine.")
        with self.verrou:
            if not M.placer_origine(self.document, actif, sym):
                raise ValueError("Impossible de poser l'origine (page du dessin introuvable).")
            self.attente.append(("origine", actif, sym))
            self.version += 1
            self.sauver()
            return self.etat()

    def _position(self, d):
        """Pose, déplace ou retire le point de départ ou de fin d'un remplissage. Le symbole vient d'Ink/Stitch
        (commande « Attacher des commandes ») ; il est ensuite placé là où l'utilisateur a cliqué."""
        i, quoi = d["id"], d["quoi"]
        if quoi not in M.POSITIONS:
            raise ValueError("Commande inconnue.")
        with self.verrou:
            if self.document is None or M.par_id(self.document, i) is None:
                raise ValueError("Objet introuvable : appuyez sur %s dans Inkscape." % S.RACCOURCI)
            if d.get("retirer"):
                if M.retirer_commande(self.document, i, quoi):
                    self.attente.append(("detacher", i, quoi))
                    self.version += 1
                    self.sauver()
                return self.etat()
            existe = M.groupe_commande(self.document, i, quoi)[0] is not None
            copie = None if existe else _lire(etree.tostring(self.document.getroot()))
        if copie is not None:
            code, out, err = E.executer(copie, "object_commands", [i], {quoi: "true"}, delai=120)
            res = E.document_modifie(out)
            groupe, sym = M.groupe_commande(res, i, quoi) if res is not None else (None, None)
            if not groupe:
                raise ValueError(_message(err) or "Ink/Stitch n'a pas pu attacher la commande.")
        with self.verrou:
            if copie is not None and not M.poser_commande(self.document, i, quoi, groupe, sym):
                raise ValueError("Objet introuvable.")
            if d.get("x") is not None and d.get("y") is not None:
                M.deplacer_commande(self.document, i, quoi, d["x"], d["y"])
            groupe, sym = M.groupe_commande(self.document, i, quoi)
            self.attente.append(("attacher", i, quoi, groupe, sym))
            self.version += 1
            self.sauver()
            return self.etat()

    def _relier_sauts(self, d):
        """Remplace les sauts plus courts que « max » mm entre objets de même couleur par une ligne de points droits,
        comme les chemins de liaison dessinés à la main. Les coupes et arrêts voulus sont respectés."""
        with self.verrou:
            if self.document is None:
                raise ValueError("Aucun dessin : appuyez sur %s dans Inkscape." % S.RACCOURCI)
            avant = etree.tostring(self.document.getroot())
            copie, n0 = _lire(avant), len(M.objets(self.document))
            version = self.version
        code, out, err = E.executer(copie, "jump_to_stroke", None, {
            "minimum-jump-length": "0", "maximum-jump-length": str(float(d.get("max") or 3)),
            "exclude-trim": "true", "exclude-stop": "true", "exclude-force-lock-stitch": "true"}, delai=300)
        doc = E.document_modifie(out)
        with self.verrou:
            if version != self.version or etree.tostring(self.document.getroot()) != avant:
                raise ValueError("Le dessin a changé pendant le calcul : relancez.")
            n = len(M.objets(doc)) - n0 if doc is not None else 0
            if n <= 0:
                return {"n": 0, "etat": self.etat(), "message": _message(err)}
            for el in M.objets(doc):                  # les liaisons créées par Ink/Stitch n'ont pas d'id
                if not el.get("id"):
                    el.set("{%s}label" % M.INKSCAPE_NS, "Liaison")
            M.completer_ids(doc)
            self.document = doc
            self.ids = []
            self.version += 1
            self.attente.append(("commande", "jump_to_stroke"))
            self.sauver()
            self.log("%d saut(s) relié(s) par des points droits" % n)
            return {"n": n, "etat": self.etat()}

    def _ouvrir_machine(self, d):
        chemin = d.get("chemin") or ""
        if not os.path.isfile(chemin):
            raise ValueError("Fichier introuvable.")
        doc, err = E.importer(chemin)
        if doc is None:
            raise ValueError(_message(err) or "Ink/Stitch ne sait pas lire ce fichier.")
        base = os.path.splitext(chemin)[0]
        sortie, n = base + ".svg", 1
        while os.path.exists(sortie):                  # jamais d'écrasement
            n += 1
            sortie = "%s (%d).svg" % (base, n)
        doc.write(sortie, encoding="utf-8", xml_declaration=True)
        r, err = E.points(doc)
        infos = {}
        if r and r["points"]:
            st = [p for p in r["points"] if p[2] == "STITCH"]
            xs, ys = [p[0] for p in st] or [0], [p[1] for p in st] or [0]
            infos = {"points": len(st), "fils": len(r["fils"]), "largeur": round((max(xs) - min(xs)) / 10, 1),
                     "hauteur": round((max(ys) - min(ys)) / 10, 1)}
        ouvert = False if os.environ.get("BRODERIE_SANS_NAVIGATEUR") else S.ouvrir_dans_inkscape(sortie)   # essais : rien n'est ouvert
        self.log("Fichier machine ouvert : %s" % os.path.basename(sortie))
        return {"svg": sortie, "ouvert": ouvert, "infos": infos}

    def _verifier(self, d):
        """Vérifier avant d'exporter : dépistage d'Ink/Stitch (traduit), sauts longs sans coupe, zones trop denses,
        objets minuscules. Chaque problème est rattaché à l'objet concerné, avec ce qu'il faut faire."""
        with self.verrou:
            if self.document is None:
                raise ValueError("Aucun dessin : appuyez sur ⌘⌥B dans Inkscape.")
            doc = _lire(etree.tostring(self.document.getroot()))
        boites = M.boites_objets(doc)
        noms = {i: M.decrire(M.par_id(doc, i))["nom"] for i in boites}
        mm = M.mm_par_unite(doc)
        out, vus = [], set()

        def ajouter(gravite, titre, detail, ident, corriger=None, cle=None):
            cle = cle or (titre, ident)
            if cle in vus:
                return
            vus.add(cle)
            out.append({"gravite": gravite, "titre": titre, "detail": detail, "id": ident,
                        "objet": noms.get(ident), "corriger": corriger})

        # 1. dépistage d'Ink/Stitch
        code, sortie, err = E.executer(doc, "troubleshoot", None, {"show-errors": True, "show-warnings": True,
                                       "show-type-warning": True, "pointer-size": 5, "font-size": 2}, delai=180)
        res = E.document_modifie(sortie)
        if res is not None:
            for nom, x, y in M.problemes_inkstitch(doc, res):
                gravite, titre, detail = M.PROBLEMES.get(nom, ("alerte", nom, "Signalé par Ink/Stitch."))
                ajouter(gravite, titre, detail, M._objet_proche(doc, x, y, boites))
        # 2. sauts longs sans coupe (le point de départ du saut désigne l'objet à couper)
        for ident, long_mm in self._sauts_longs(doc, boites, float(d.get("saut_max") or 5)):
            ajouter("alerte", "Saut long sans coupe",
                    "Un saut de %.0f mm laisse un fil à couper à la main : ajoutez une coupe après cet objet." % long_mm,
                    ident, {"action": "params", "valeurs": {"trim_after": True}, "libelle": "Couper après"})
        # 3. zones trop denses (carte de densité d'Ink/Stitch : points rouges)
        dens, err = E.densite(doc)
        if dens:
            try:
                plan = etree.fromstring('<svg xmlns="http://www.w3.org/2000/svg">%s</svg>' % dens)
                rouges = {}
                for gr in plan.iter("{%s}g" % M.SVG_NS):
                    if "red" in (gr.get("id") or ""):
                        for ci in gr.iter("{%s}circle" % M.SVG_NS):
                            k = 0.264583 if "scale" in (ci.get("transform") or gr.get("transform") or "") else 1
                            ident = M._objet_proche(doc, float(ci.get("cx", 0)) * k, float(ci.get("cy", 0)) * k, boites)
                            rouges[ident] = rouges.get(ident, 0) + 1
                # la carte d'Ink/Stitch marque toujours quelques points serrés aux bords : on ne signale que les vrais excès
                for ident, n in rouges.items():
                    if n > 200:
                        ajouter("alerte", "Zone trop dense", "%d points trop serrés (risque de casse) : espacez les rangs "
                                "ou réduisez les sous-couches de cet objet." % n, ident)
                    elif n > 30:
                        ajouter("conseil", "Quelques points serrés", "%d points serrés, souvent aux bords : regardez la carte "
                                "de densité dans l'aperçu (bouton carreaux)." % n, ident)
            except etree.XMLSyntaxError:
                pass
        # 4. satins trop larges : au-delà de 8 mm, les points sont longs, lâches, et s'accrochent
        for ident in boites:
            el = M.par_id(doc, ident)
            if el is None or "satin_column" not in M.types(el) or M.attr(el, "satin_method") in ("e_stitch", "s_stitch"):
                continue
            if M.attr(el, "max_stitch_length_mm"):
                continue                               # découpe des longs points déjà active
            larg = M.largeur_satin(doc, el)
            if larg and larg > 8:
                ajouter("alerte", "Satin trop large",
                        "Jusqu'à %.0f mm de large : des points aussi longs sont lâches et s'accrochent. Découpez les longs "
                        "points, ou brodez cette forme en remplissage." % larg, ident,
                        {"action": "params", "valeurs": {"max_stitch_length_mm": 7}, "libelle": "Découper à 7 mm"})
        # 5. objets minuscules
        for ident, b in boites.items():
            if (b[2] - b[0]) * mm < 1 and (b[3] - b[1]) * mm < 1:
                ajouter("alerte", "Objet minuscule", "Moins de 1 mm : il ne se brodera pas bien. Agrandissez-le ou masquez-le.",
                        ident, {"action": "visible", "visible": False, "libelle": "Masquer"})
        ordre = {"erreur": 0, "alerte": 1, "conseil": 2}
        out.sort(key=lambda p: ordre.get(p["gravite"], 3))
        return {"problemes": out}

    def _bobines(self, d):
        """Fils du dessin (ordre de couture) et bobine de la marque choisie pour chacun : la plus proche,
        ou celle choisie à la main (d["choix"] : {couleur du dessin: couleur de la bobine})."""
        with self.verrou:
            if self.document is None:
                raise ValueError("Aucun dessin : appuyez sur ⌘⌥B dans Inkscape.")
            fils = M.fils_du_dessin(self.document)
        marques = M.palettes(E.ressources())
        marque = d.get("marque")
        if marque not in marques:                       # comme Ink/Stitch : le nuancier qui contient presque toutes
            def exactes(m):                             # les couleurs exactes du dessin, sinon Madeira Rayon
                cs = {f["couleur"] for f in M.lire_palette(marques[m])}
                return sum(f["couleur"] in cs for f in fils)
            meilleur = max(marques, key=exactes, default=None) if fils else None
            reconnu = meilleur and exactes(meilleur) >= max(2, 0.8 * len(fils))   # 80 % de couleurs exactes
            marque = meilleur if reconnu else ("Madeira Rayon" if "Madeira Rayon" in marques
                                                                       else next(iter(marques), None))
        nuancier = M.lire_palette(marques[marque]) if marque else []
        choix = {M.hex6(k): M.hex6(v) for k, v in (d.get("choix") or {}).items()}
        for f in fils:
            b = next((x for x in nuancier if x["couleur"] == choix.get(f["couleur"])), None) if choix.get(f["couleur"]) else None
            b = b or min(nuancier, key=lambda x: M.ecart(f["couleur"], x["couleur"]), default=None)
            f["bobine"] = b
            f["ecart"] = round(M.ecart(f["couleur"], b["couleur"]), 1) if b else None
        return {"marques": list(marques), "marque": marque, "fils": fils}

    def _figer(self, d):
        """« Figer en points » : chaque objet choisi devient ses points réels en point manuel (retouche point par
        point, dentelle FSL). Ink/Stitch calcule le plan de broderie de chaque objet seul, sur une copie."""
        doc = _lire(etree.tostring(self.document.getroot()))
        faits = []
        for i in d.get("ids") or []:
            el = M.par_id(doc, i)
            if el is None or M.masque(el):
                continue
            code, out, err = E.executer(doc, "stitch_plan_preview", [i], {
                "render-mode": "simple", "move-to-side": False, "layer-visibility": "unchanged", "needle-points": False,
                "render-jumps": False, "ignore-layer": False, "overwrite": True, "visual-commands": False,
                "insensitive": False}, delai=180)
            res = E.document_modifie(out)
            plan = res.getroot().xpath("//*[@id='%s']" % M.PLAN) if res is not None else []
            if not plan:
                raise ValueError(_message(err) or "Ink/Stitch n'a pas calculé les points de « %s »." % M.decrire(el)["nom"])
            g = M.figer_points(doc, i, plan[0])
            if g:
                faits.append(g)
        if not faits:
            raise ValueError("Aucun objet brodé à figer.")
        self.document = doc
        self.ids = []
        self.version += 1
        self.attente.append(("commande", "figer_points"))
        self.log("%d objet(s) figé(s) en points" % len(faits))
        return {"ids": faits, "etat": self.etat()}

    def _apercu_texte(self, d):
        """Aperçu d'un texte avant de l'ajouter : fabriqué sur un dessin vide, points calculés par Ink/Stitch."""
        with self.verrou:
            if self.document is None:
                raise ValueError("Aucun dessin : appuyez sur ⌘⌥B dans Inkscape.")
            vide = M.dessin_vide(self.document)
            self._guide(self.document, d)
        res, g = self._texte(vide, d)
        b = M.emprise(res, [g.get("id")])
        k = M.mm_par_unite(res)
        svg, err = E.apercu(res, None, d.get("mode") or "points", {"sauts": False, "penetrations": False})
        if not svg:
            raise ValueError(_message(err) or "Aperçu impossible.")
        n = len(re.findall(r"[-\d.]+[ ,][-\d.]+", " ".join(re.findall(r' d="([^"]*)"', svg))))
        return {"svg": svg, "largeur": round((b[2] - b[0]) * k, 1) if b else 0,
                "hauteur": round((b[3] - b[1]) * k, 1) if b else 0, "points": n}

    def _commande(self, d):
        """Commande Ink/Stitch quelconque (catalogue complet), lancée en arrière-plan : certaines ouvrent
        une fenêtre (lettrage, paramètres…) et le panneau comme Inkscape doivent rester utilisables.
        Le résultat remplace le dessin du panneau s'il n'a pas changé entre-temps."""
        ext = d["extension"]
        cmd = next((c for c in M.CATALOGUE["commandes"] if c["extension"] == ext and c["type"] == "effect"), None)
        if cmd is None:
            raise ValueError("commande inconnue")
        if self.tache and not self.tache.get("fini"):
            raise ValueError("Une commande Ink/Stitch est déjà en cours : terminez-la d'abord.")
        params = normaliser(cmd, d.get("params") or {})
        avant = etree.tostring(self.document.getroot())
        copie = _lire(avant)
        if ext == "fill_to_satin":                     # une forme à la fois remplie et contourée : Ink/Stitch
            for i in d.get("ids") or []:               # ouvre un avertissement (en anglais) ; le contour ne sert à rien ici
                el = M.par_id(copie, i)
                if el is not None and "fill_stitch" in M.types(el) and len(M.types(el)) > 1:
                    M.changer_couleur(el, "stroke", "none")
        version = self.version
        self.tache = {"extension": ext, "nom": M.tr(cmd["nom"]), "fini": False, "debut": time.time()}

        def travail():
            try:
                code, out, err = E.executer(copie, ext, d.get("ids") or None, params, delai=3600)
                doc = E.document_modifie(out)
                modifie = doc is not None and etree.tostring(doc.getroot()) != avant
                msg = _message(err)
                with self.verrou:
                    if modifie and (self.version != version or etree.tostring(self.document.getroot()) != avant):
                        res = {"modifie": False, "erreur": "Le dessin a changé pendant la commande : relancez-la."}
                    elif modifie:
                        M.completer_ids(doc)
                        self.document = doc
                        self.ids = []                  # objets créés ou remplacés : on montre tout le dessin
                        self.version += 1
                        self.attente.append(("commande", ext))
                        self.sauver()
                        self.log("Commande Ink/Stitch : %s" % M.tr(cmd["nom"]))
                        res = {"modifie": True, "message": msg}
                    else:
                        res = {"modifie": False, "message": msg, "erreur": msg if code else None}
            except Exception as e:                   # le panneau doit toujours être prévenu
                res = {"modifie": False, "erreur": "%s: %s" % (type(e).__name__, e)}
            res.update(self.tache, fini=True)
            self.tache = res

        threading.Thread(target=travail, daemon=True).start()
        return {"lance": True, "fenetre": bool(cmd.get("fenetre"))}


def _message(err):
    """Dernières lignes utiles de la sortie d'erreur d'Ink/Stitch (ses messages pour l'utilisateur)."""
    lignes = [l for l in (err or "").strip().splitlines() if l.strip() and "Warning" not in l]
    return "\n".join(lignes[-6:])[-1500:] or None


def normaliser(cmd, params):
    """Valeurs du panneau → format attendu par Ink/Stitch (comme Inkscape les passe)."""
    types = {q["name"]: q["type"] for q in cmd["params"]}
    out = {}
    for k, v in params.items():
        if types.get(k) == "color" and isinstance(v, str):
            h = v.strip().lower().replace("#", "").replace("0x", "")
            if len(h) == 6:
                h += "ff"
            try:
                v = str(int(h, 16))                    # Inkscape passe les couleurs en entier RGBA
            except ValueError:
                pass
        out[k] = v
    return out


def _gestionnaire(session):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def _envoyer(self, code, corps, type_="application/json; charset=utf-8", extra=None):
            if isinstance(corps, str):
                corps = corps.encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", type_)
            self.send_header("Content-Length", str(len(corps)))
            self.send_header("Cache-Control", "no-store")
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(corps)

        def do_GET(self):
            u = urlparse(self.path)
            if u.path == "/export":
                q = parse_qs(u.query)
                fmt = q.get("format", ["dst"])[0]
                if fmt not in session.etat()["formats"]:
                    return self._envoyer(400, "format inconnu", "text/plain; charset=utf-8")
                ids = [i for i in q.get("ids", [""])[0].split(",") if i]
                with session.verrou:
                    data, err = E.exporter(session.document, fmt, ids or None)
                if not data:
                    return self._envoyer(500, err or "Export impossible", "text/plain; charset=utf-8")
                return self._envoyer(200, data, "application/octet-stream",
                                     {"Content-Disposition": 'attachment; filename="%s.%s"' % (session.nom, fmt)})
            if u.path.startswith("/icone/"):
                f = E.icone(u.path.split("/")[2])
                if not f:
                    return self._envoyer(404, "introuvable", "text/plain")
                with open(f, "rb") as fh:
                    return self._envoyer(200, fh.read(), "image/png")
            if u.path.startswith("/motif/"):
                f = E.apercu_motif(u.path.split("/")[2])
                if not f:
                    return self._envoyer(404, "introuvable", "text/plain")
                with open(f, "rb") as fh:
                    return self._envoyer(200, fh.read(), "image/png")
            if u.path.startswith("/police/"):
                f = E.apercu_police(u.path.split("/")[2])
                if not f:
                    return self._envoyer(404, "introuvable", "text/plain")
                with open(f, "rb") as fh:
                    return self._envoyer(200, fh.read(), "image/png")
            nom = "index.html" if u.path in ("/", "") else u.path.lstrip("/")
            f = os.path.normpath(os.path.join(UI, nom))
            if not f.startswith(UI) or not os.path.isfile(f):
                return self._envoyer(404, "introuvable", "text/plain")
            types = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                     ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png"}
            with open(f, "rb") as fh:
                corps = fh.read()
            self._envoyer(200, corps, types.get(os.path.splitext(f)[1], "application/octet-stream"))

        def do_POST(self):
            nom = urlparse(self.path).path.strip("/").split("/")[-1]
            n = int(self.headers.get("Content-Length") or 0)
            try:
                d = json.loads(self.rfile.read(n) or b"{}")
                self._envoyer(200, json.dumps(session.action(nom, d), ensure_ascii=False))
            except Exception as e:                       # message lisible dans le panneau
                self._envoyer(500, json.dumps({"erreur": "%s: %s" % (type(e).__name__, e)}, ensure_ascii=False))
    return H


def principal():
    """Démarre le serveur (processus d'arrière-plan lancé par l'extension)."""
    session = Session()
    session.restaurer()
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), _gestionnaire(session))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    while True:
        time.sleep(30)
        if time.time() - session.actif > INACTIF:
            srv.shutdown()
            return
