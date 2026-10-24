"""Broderie pour Inkscape : petit serveur local qui sert le panneau et applique les actions.

Écoute uniquement 127.0.0.1 (rien ne sort de l'ordinateur). S'arrête quand on clique
« Appliquer » ou « Annuler » dans le panneau.
"""
import json
import os
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

from . import modele as M
from . import moteur as E

UI = os.path.join(M.ICI, "ui")


class Session:
    def __init__(self, document, ids, nom="dessin"):
        self.document = document          # lxml ElementTree (modifié sur place)
        E.versionner(document)            # décidé à l'ouverture, avant toute modification du panneau
        self.ids = [i for i in (ids or []) if i]
        self.nom = nom
        self.fini = threading.Event()
        self.appliquer = False
        self.verrou = threading.Lock()
        self.journal = []
        self.vu = None                    # dernier signe de vie du panneau

    # --- état -------------------------------------------------------------
    def etat(self):
        objs = M.objets(self.document, self.ids)
        if self.ids and not objs:                       # sélection sans objet brodable : tout le document
            objs = M.objets(self.document)
        cmds = [c for c in M.CATALOGUE["commandes"] if c["type"] == "effect"]
        sorties = sorted({c["format"] for c in M.CATALOGUE["commandes"] if c["type"] == "output" and c["format"]})
        return {"objets": [M.decrire(o) for o in objs], "selection": self.ids, "nom": self.nom,
                "moteur": {"chemin": E.binaire(), "version": E.version()},
                "commandes": cmds, "formats": sorties, "journal": self.journal[-20:]}

    def log(self, msg):
        self.journal.append(msg)

    # --- actions ----------------------------------------------------------
    def action(self, nom, d):
        with self.verrou:
            if nom == "present":                    # signe de vie du panneau (onglet ouvert)
                self.vu = time.time()
                return {"ok": True}
            if nom == "etat":
                return self.etat()
            if nom == "schema":
                return M.schema()
            if nom == "params":
                el = M.par_id(self.document, d["id"])
                M.ecrire(el, d.get("valeurs", {}))
                self.log("Réglages modifiés : %s" % d["id"])
                return self.etat()
            if nom == "couleur":
                M.changer_couleur(M.par_id(self.document, d["id"]), d["quoi"], d["valeur"])
                return self.etat()
            if nom == "ordre":
                M.deplacer(M.par_id(self.document, d["id"]), int(d["sens"]))
                return self.etat()
            if nom == "apercu":
                svg, err = E.apercu(self.document, d.get("ids") or None)
                return {"svg": svg, "erreur": None if svg else err[-2000:]}
            if nom == "simulateur":
                E.executer(self.document, "simulator", d.get("ids") or None, attendre=False)
                return {"ok": True}
            if nom == "commande":
                return self._commande(d)
            if nom == "terminer":
                self.appliquer = bool(d.get("appliquer"))
                self.fini.set()
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
            self.document._setroot(doc.getroot())
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


def lancer(session, port=None, ouvrir=True):
    """Sert le panneau et attend « Appliquer » ou « Annuler ». Renvoie True s'il faut appliquer."""
    port = int(port or os.environ.get("BRODERIE_PORT") or 0)
    srv = ThreadingHTTPServer(("127.0.0.1", port), _gestionnaire(session))
    url = "http://127.0.0.1:%d/" % srv.server_address[1]
    pf = os.environ.get("BRODERIE_PORTFILE")
    if pf:
        with open(pf, "w") as f:
            f.write(url)
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    if ouvrir and not os.environ.get("BRODERIE_SANS_NAVIGATEUR"):
        webbrowser.open(url)
    # onglet fermé (plus de signe de vie pendant 45 s) : on libère Inkscape sans rien changer
    delai = float(os.environ.get("BRODERIE_DELAI") or 45)
    while not session.fini.wait(2):
        if session.vu and time.time() - session.vu > delai and not session.verrou.locked():
            session.appliquer = False
            break
    srv.shutdown()
    return session.appliquer
