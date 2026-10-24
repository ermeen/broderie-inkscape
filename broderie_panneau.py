#!/usr/bin/env python3
"""Broderie pour Inkscape : extension « Panneau de broderie » (Extensions › Broderie).

Aller-retour rapide, Inkscape n'est pas bloqué :
  - démarre le serveur du panneau en arrière-plan s'il ne tourne pas ;
  - lui envoie le dessin et la sélection ;
  - applique au dessin les réglages modifiés dans le panneau depuis la dernière fois ;
  - ouvre le panneau dans le navigateur s'il n'est pas déjà ouvert.
"""
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
import webbrowser

ICI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ICI)

import inkex  # noqa: E402
from lxml import etree  # noqa: E402

PORT = int(os.environ.get("BRODERIE_PORT") or 47811)
URL = "http://127.0.0.1:%d/" % PORT


def _appel(nom, data=None, delai=60):
    req = urllib.request.Request(URL + "api/" + nom, data=json.dumps(data or {}).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=delai) as r:
        return json.loads(r.read())


def _demarrer_serveur():
    try:
        _appel("present", delai=2)
        return
    except OSError:
        pass
    # sorties redirigées vers un journal : sinon Inkscape attendrait la fin du serveur
    with open(os.path.join(tempfile.gettempdir(), "broderie-panneau.log"), "ab") as journal:
        serveur = subprocess.Popen([sys.executable, os.path.join(ICI, "broderie_serveur.py")], cwd=ICI,
                                   stdin=subprocess.DEVNULL, stdout=journal, stderr=journal, start_new_session=True)
    serveur.returncode = 0          # il doit survivre à l'extension : pas d'avertissement « still running »
    for _ in range(50):
        time.sleep(0.2)
        try:
            _appel("present", delai=2)
            return
        except OSError:
            pass
    raise inkex.AbortExtension("Le panneau de broderie n'a pas pu démarrer.")


def ouvrir_navigateur():
    """Ouvre le panneau dans le navigateur par défaut. `open` de macOS d'abord : le module
    webbrowser passe par AppleScript, que macOS peut bloquer sans rien dire quand Inkscape le lance."""
    try:
        if sys.platform == "darwin":
            subprocess.run(["/usr/bin/open", URL], check=True, timeout=10,
                           stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            return
    except (OSError, subprocess.SubprocessError) as e:
        with open(os.path.join(tempfile.gettempdir(), "broderie-panneau.log"), "a") as j:
            j.write("ouverture du navigateur : %s\n" % e)
    webbrowser.open(URL)


class PanneauBroderie(inkex.EffectExtension):
    def effect(self):
        _demarrer_serveur()
        nom = os.path.splitext(os.path.basename(self.svg.get("sodipodi:docname") or "dessin"))[0] or "dessin"
        r = _appel("sync", {"svg": etree.tostring(self.document.getroot(), encoding="unicode"),
                            "ids": list(self.options.ids or []), "nom": nom}, delai=600)
        if not r.get("panneau_ouvert") and not os.environ.get("BRODERIE_SANS_NAVIGATEUR"):
            ouvrir_navigateur()
        if r.get("svg"):
            self.document = inkex.load_svg(r["svg"].encode("utf-8"))
            self.svg = self.document.getroot()


if __name__ == "__main__":
    PanneauBroderie().run()
