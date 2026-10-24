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
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from lxml import etree

from . import modele as M
from . import moteur as E

UI = os.path.join(M.ICI, "ui")
PORT = int(os.environ.get("BRODERIE_PORT") or 47811)
INACTIF = float(os.environ.get("BRODERIE_INACTIF") or 3600)    # secondes sans panneau ni Inkscape → arrêt


def _lire(svg):
    return etree.ElementTree(etree.fromstring(svg.encode("utf-8") if isinstance(svg, str) else svg,
                                              etree.XMLParser(huge_tree=True)))


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
        self.version = 0                  # change à chaque nouveau dessin reçu d'Inkscape
        self.verrou = threading.RLock()
        self.journal = []
        self.vu = 0.0                     # dernier signe de vie du panneau
        self.actif = time.time()

    # --- état -------------------------------------------------------------
    def etat(self):
        if self.document is None:
            return {"objets": [], "selection": [], "nom": self.nom, "attente": 0, "version": self.version,
                    "moteur": {"chemin": E.binaire(), "version": E.version()}, "commandes": [], "formats": [],
                    "journal": self.journal[-20:], "sans_dessin": True}
        objs = M.objets(self.document, self.ids)
        if self.ids and not objs:                       # sélection sans objet brodable : tout le document
            objs = M.objets(self.document)
        cmds = [c for c in M.CATALOGUE["commandes"] if c["type"] == "effect"]
        sorties = sorted({c["format"] for c in M.CATALOGUE["commandes"] if c["type"] == "output" and c["format"]})
        return {"objets": [M.decrire(o) for o in objs], "selection": self.ids, "nom": self.nom,
                "attente": len(self.attente), "version": self.version,
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
            return {"svg": renvoi, "panneau_ouvert": time.time() - self.vu < 12}

    def _rejouer(self, doc, op):
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
        if nom == "present":                           # signe de vie (sans verrou : jamais bloqué)
            self.vu = self.actif = time.time()
            return {"version": self.version, "attente": len(self.attente)}
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
                svg, err = E.apercu(self.document, d.get("ids") or None)
                return {"svg": svg, "erreur": None if svg else (err or "")[-2000:]}
            if nom == "simulateur":
                E.executer(self.document, "simulator", d.get("ids") or None, attendre=False)
                return {"ok": True}
            if nom == "commande":
                return self._commande(d)
            if nom == "quitter":
                threading.Timer(0.3, os._exit, (0,)).start()
                return {"ok": True}
            raise ValueError("action inconnue : %s" % nom)

    def _commande(self, d):
        """Commande Ink/Stitch quelconque (catalogue complet) : le document renvoyé remplace l'actuel."""
        ext = d["extension"]
        if not any(c["extension"] == ext and c["type"] == "effect" for c in M.CATALOGUE["commandes"]):
            raise ValueError("commande inconnue")
        code, out, err = E.executer(self.document, ext, d.get("ids") or None, d.get("params") or {})
        doc = E.document_modifie(out)
        if doc is not None:
            self.document = doc
            self.attente.append(("commande", ext))
            self.log("Commande Ink/Stitch exécutée : %s" % ext)
            return {"ok": True, "modifie": True, "erreur": err[-2000:] if code else None}
        return {"ok": code == 0, "modifie": False, "erreur": err[-2000:] or None}


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
            nom = "index.html" if u.path in ("/", "") else u.path.lstrip("/")
            f = os.path.normpath(os.path.join(UI, nom))
            if not f.startswith(UI) or not os.path.isfile(f):
                return self._envoyer(404, "introuvable", "text/plain")
            types = {".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
                     ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml"}
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
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), _gestionnaire(session))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    while True:
        time.sleep(30)
        if time.time() - session.actif > INACTIF:
            srv.shutdown()
            return
