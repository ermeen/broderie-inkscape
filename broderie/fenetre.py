"""Broderie pour Inkscape : place la fenêtre Safari du panneau, comme un panneau ancré à droite."""
import subprocess

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
  let neuve = false;
  if (!fen) {
    safari.Document().make();
    fen = safari.windows[0];
    fen.currentTab.url = url + '/';
    neuve = true;
  }
  // taille imposée seulement pour une fenêtre neuve ou sur demande : sinon on garde celle choisie
  if (neuve || argv[2] === 'forcer') {
    fen.bounds = cadre;
    delay(0.6);                     // une fenêtre neuve se redimensionne en chargeant : on recommence
    fen.bounds = cadre;
  }
  fen.index = 1;
  safari.activate();
  return 'ok';
}
"""




def placer(url, largeur=LARGEUR, forcer=False):
    """Retrouve ou ouvre la fenêtre du panneau dans Safari. Renvoie (réussi, message)."""
    try:
        p = subprocess.run(["/usr/bin/osascript", "-l", "JavaScript", "-e", SAFARI, url.rstrip("/"), str(int(largeur)),
                            "forcer" if forcer else ""], capture_output=True, text=True, timeout=20,
                           stdin=subprocess.DEVNULL)
        return p.stdout.strip() == "ok", (p.stdout.strip() + " " + p.stderr.strip()[:200]).strip()
    except (OSError, subprocess.SubprocessError) as e:
        return False, str(e)


# Bouton « Envoyer à Inkscape » du panneau : clique le menu Extensions › Broderie › Panneau de broderie
# d'Inkscape (même effet que ⌘⌥B). macOS demande une fois l'autorisation « Accessibilité ».
MENU = '''
tell application "System Events"
    if not (exists process "Inkscape") then return "absent"
    tell process "Inkscape"
        click menu item "Panneau de broderie" of menu 1 of menu item "Broderie" of menu 1 of menu bar item "Extensions" of menu bar 1
    end tell
end tell
return "ok"
'''


def envoyer_a_inkscape():
    """Renvoie (réussi, message lisible)."""
    try:
        p = subprocess.run(["/usr/bin/osascript", "-e", MENU], capture_output=True, text=True, timeout=30,
                           stdin=subprocess.DEVNULL)
    except (OSError, subprocess.SubprocessError) as e:
        return False, str(e)
    out, err = p.stdout.strip(), p.stderr.strip()
    if out == "ok":
        return True, ""
    if out == "absent":
        return False, "Inkscape n'est pas ouvert."
    if "-1719" in err or "-25211" in err or "assistive" in err.lower() or "accessibilit" in err.lower():
        return False, ("macOS doit autoriser le panneau à utiliser les menus d'Inkscape : Réglages Système › "
                       "Confidentialité et sécurité › Accessibilité, activez « Inkscape » (ou « Python »), "
                       "puis recliquez. En attendant, ⌘⌥B dans Inkscape fait la même chose.")
    return False, "Envoi impossible (%s). ⌘⌥B dans Inkscape fait la même chose." % (err[-200:] or out)
