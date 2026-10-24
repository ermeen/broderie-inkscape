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
JOURNAL = os.path.join(tempfile.gettempdir(), "broderie-panneau.log")


def note(msg):
    try:
        with open(JOURNAL, "a") as j:
            j.write("%s [ext %d] %s\n" % (time.strftime("%H:%M:%S"), os.getpid(), msg))
    except OSError:
        pass
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


def navigateur_par_defaut():
    """Identifiant du navigateur par défaut de macOS (Safari si aucun choix enregistré)."""
    import plistlib
    f = os.path.expanduser("~/Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist")
    try:
        with open(f, "rb") as fh:
            for h in plistlib.load(fh).get("LSHandlers", []):
                if h.get("LSHandlerURLScheme") in ("https", "http") and h.get("LSHandlerRoleAll"):
                    return h["LSHandlerRoleAll"]
    except (OSError, ValueError):
        pass
    return "com.apple.Safari"


LARGEUR = 440      # largeur du panneau, collé au bord droit de l'écran

# Script JXA (JavaScript pour l'automatisation de macOS) : retrouve l'onglet du panneau dans Safari,
# le met dans sa propre fenêtre étroite contre le bord droit de l'écran et l'affiche au premier plan.
SAFARI = r"""
ObjC.import('AppKit');
function run(argv) {
  const url = argv[0], larg = parseInt(argv[1]);
  const ecran = $.NSScreen.mainScreen, f = ecran.frame, v = ecran.visibleFrame;
  const haut = f.size.height - (v.origin.y + v.size.height);
  const cadre = { x: v.origin.x + v.size.width - larg, y: haut, width: larg, height: v.size.height };
  const safari = Application('Safari');
  let fen = null;
  for (const w of safari.windows()) {
    let tabs; try { tabs = w.tabs(); } catch (e) { continue; }
    for (const t of tabs) {
      let u = ''; try { u = t.url() || ''; } catch (e) { }
      if (u.indexOf(url) === 0) {
        if (tabs.length === 1) { fen = w; } else { t.close(); }
        break;
      }
    }
    if (fen) break;
  }
  if (!fen) {
    safari.Document().make();
    fen = safari.windows[0];
    fen.currentTab.url = url + '/';
  }
  fen.bounds = cadre;
  delay(0.6);                       // une fenêtre neuve se redimensionne en chargeant : on recommence
  fen.bounds = cadre;
  fen.index = 1;
  safari.activate();
  return 'ok';
}
"""


def ouvrir_navigateur(deja_ouvert=False):
    """Montre le panneau au premier plan : dans Safari, il a sa propre fenêtre étroite contre le bord
    droit de l'écran (comme un panneau ancré) ; avec un autre navigateur, il est ouvert par `open`.
    `open` de macOS plutôt que le module webbrowser (AppleScript, que macOS peut bloquer sans rien dire)."""
    if sys.platform != "darwin":
        webbrowser.open(URL)
        return
    nav = navigateur_par_defaut()
    if nav.lower() == "com.apple.safari":
        try:
            p = subprocess.run(["/usr/bin/osascript", "-l", "JavaScript", "-e", SAFARI, URL.rstrip("/"), str(LARGEUR)],
                               capture_output=True, text=True, timeout=20, stdin=subprocess.DEVNULL)
            note("Safari : %s %s" % (p.stdout.strip(), p.stderr.strip()[:200]))
            if p.stdout.strip() == "ok":
                return
        except (OSError, subprocess.SubprocessError) as e:
            note("Safari : %s" % e)
    try:
        subprocess.run(["/usr/bin/open", "-b", nav, URL], check=True, timeout=10, stdin=subprocess.DEVNULL,
                       stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    except (OSError, subprocess.SubprocessError) as e:
        note("ouverture du navigateur : %s" % e)
        webbrowser.open(URL)


class PanneauBroderie(inkex.EffectExtension):
    def effect(self):
        note("début, sélection=%s" % list(self.options.ids or []))
        _demarrer_serveur()
        note("serveur prêt")
        nom = os.path.splitext(os.path.basename(self.svg.get("sodipodi:docname") or "dessin"))[0] or "dessin"
        r = _appel("sync", {"svg": etree.tostring(self.document.getroot(), encoding="unicode"),
                            "ids": list(self.options.ids or []), "nom": nom}, delai=600)
        note("sync faite, panneau ouvert=%s, renvoi=%s" % (r.get("panneau_ouvert"), bool(r.get("svg"))))
        # réglages renvoyés : on reste dans Inkscape ; sinon on montre le panneau
        if not r.get("svg") and not os.environ.get("BRODERIE_SANS_NAVIGATEUR"):
            ouvrir_navigateur(bool(r.get("panneau_ouvert")))
            note("panneau montré")
        if r.get("svg"):
            self.document = inkex.load_svg(r["svg"].encode("utf-8"))
            self.svg = self.document.getroot()


if __name__ == "__main__":
    try:
        PanneauBroderie().run()
        note("fin")
    except BaseException as e:
        note("erreur : %r" % e)
        raise
