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
                             "~/Library/Application Support/broderie-panneau/session-%d.json" % PORT)
INACTIF = float(os.environ.get("BRODERIE_INACTIF") or 3600)    # secondes sans panneau ni Inkscape → arrêt


def _lire(svg):
    return etree.ElementTree(etree.fromstring(svg.encode("utf-8") if isinstance(svg, str) else svg,
                                              etree.XMLParser(huge_tree=True)))


CADRES = os.path.expanduser("~/Library/Application Support/broderie-panneau/cadres.json")
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
                    "version_panneau": VERSION_PANNEAU,
                    "moteur": {"chemin": E.binaire(), "version": E.version()}, "commandes": [], "formats": [],
                    "journal": self.journal[-20:], "sans_dessin": True}
        objs = M.objets(self.document, self.ids, masques=True)
        if self.ids and not objs:                       # sélection sans objet brodable : tout le document
            objs = M.objets(self.document, masques=True)
        cmds = M.commandes()
        sorties = sorted({c["format"] for c in M.CATALOGUE["commandes"] if c["type"] == "output" and c["format"]})
        return {"objets": [M.decrire(o) for o in objs], "selection": self.ids, "nom": self.nom,
                "attente": len(self.attente), "version": self.version,
                "reserve": {k: len(v) for k, v in self.reserve.items()},
                "version_panneau": VERSION_PANNEAU,
                "ancien": E.ancien(self.document),
                "moteur": {"chemin": E.binaire(), "version": E.version()},
                "commandes": cmds, "formats": sorties, "journal": self.journal[-20:]}

    def log(self, msg):
        self.journal.append(time.strftime("%H:%M ") + msg)

    # --- aller-retour avec Inkscape -----------------------------------------
    def sync(self, d):
        """Dessin actuel d'Inkscape → applique les modifications en attente → dessin à renvoyer (ou None)."""
        with self.verrou:
            self.actif = time.time()
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

    # --- actions du panneau -------------------------------------------------
    def action(self, nom, d):
        r = self._action(nom, d)
        if nom in ("params", "couleur", "ordre", "abandonner", "sync", "lettrage", "assembler", "marquer_a_jour", "cadre", "placer", "visible"):
            self.sauver()
        return r

    def _action(self, nom, d):
        if nom == "envoyer":                           # bouton « Envoyer à Inkscape » (sans verrou : Inkscape va appeler /sync)
            from . import fenetre
            ok, msg = fenetre.envoyer_a_inkscape()
            return {"ok": ok, "message": msg}
        if nom == "present":                           # signe de vie (sans verrou : jamais bloqué)
            self.vu = self.actif = time.time()
            return {"version": self.version, "attente": len(self.attente), "tache": self.tache}
        if nom == "apercu_texte":
            return self._apercu_texte(d)
        if nom in ("apercu", "points", "densite"):     # calculs longs : sur une copie, sans bloquer le panneau
            with self.verrou:
                if self.document is None:
                    raise ValueError("Aucun dessin : appuyez sur ⌘⌥B dans Inkscape.")
                copie = _lire(etree.tostring(self.document.getroot()))
            if nom == "densite":
                svg, err = E.densite(copie, d.get("ids") or None)
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
            if nom == "params":
                M.ecrire(M.par_id(self.document, d["id"]), d.get("valeurs", {}))
                self.attente.append(("params", d["id"], d.get("valeurs", {})))
                return self.etat()
            if nom == "couleur":
                M.changer_couleur(M.par_id(self.document, d["id"]), d["quoi"], d["valeur"])
                self.attente.append(("couleur", d["id"], d["quoi"], d["valeur"]))
                return self.etat()
            if nom == "ordre":
                if M.deplacer(M.par_id(self.document, d["id"]), int(d["sens"])):
                    self.attente.append(("ordre", d["id"], int(d["sens"])))
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
                    self.version += 1
                return self.etat()
            if nom == "placer":                       # glisser-déposer dans la liste (objets et calques)
                if M.placer(self.document, d["id"], d["cible"], bool(d.get("apres"))):
                    self.attente.append(("placer", d["id"], d["cible"], bool(d.get("apres"))))
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
            if nom == "choisir":
                return {"chemin": choisir(d.get("mode") or "file")}
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
        self.document = res
        self.ids = []                      # on garde tout le dessin dans la liste ; le panneau choisit le texte
        self.version += 1
        self.attente.append(("commande", "batch_lettering"))
        self.log("Texte brodé ajouté")
        return {"id": g.get("id")}

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


def choisir(mode):
    """Boîte de dialogue macOS de choix de fichier ou de dossier ; renvoie le chemin ou None."""
    import subprocess
    script = {"folder": "choose folder", "file_new": "choose file name",
              "files": "choose file with multiple selections allowed"}.get(mode, "choose file")
    if mode == "files":
        prog = 'set L to (%s)\nset R to ""\nrepeat with f in L\nset R to R & POSIX path of f & "|"\nend repeat\nreturn R' % script
    else:
        prog = "POSIX path of (%s)" % script
    try:
        p = subprocess.run(["/usr/bin/osascript", "-e", 'tell application "System Events" to activate', "-e", prog],
                           capture_output=True, text=True, timeout=600)
    except (OSError, subprocess.SubprocessError):
        return None
    r = p.stdout.strip().rstrip("|")
    return r.replace("|", ",") if r else None


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
