"""Broderie pour Inkscape : ce qui dépend du système (macOS, Windows, Linux).

Dossiers d'Inkscape et du panneau, programmes à lancer sans fenêtre noire, boîtes de dialogue de fichier.
Tout le reste du panneau est commun aux trois systèmes.
"""
import os
import subprocess
import sys

MAC = sys.platform == "darwin"
WINDOWS = sys.platform.startswith("win")
RACCOURCI = "⌘⌥B" if MAC else "Ctrl+Alt+B"


def profil_inkscape():
    """Dossier personnel d'Inkscape : extensions, raccourcis, palettes."""
    if os.environ.get("INKSCAPE_PROFILE_DIR"):
        return os.environ["INKSCAPE_PROFILE_DIR"]
    if MAC:
        return os.path.expanduser("~/Library/Application Support/org.inkscape.Inkscape/config/inkscape")
    if WINDOWS:
        return os.path.join(os.environ.get("APPDATA") or os.path.expanduser("~"), "inkscape")
    return os.path.join(os.environ.get("XDG_CONFIG_HOME") or os.path.expanduser("~/.config"), "inkscape")


def donnees():
    """Dossier du panneau : modifications en attente, cadres de la brodeuse."""
    if MAC:
        d = os.path.expanduser("~/Library/Application Support/broderie-panneau")
    elif WINDOWS:
        d = os.path.join(os.environ.get("APPDATA") or os.path.expanduser("~"), "broderie-panneau")
    else:
        d = os.path.join(os.environ.get("XDG_DATA_HOME") or os.path.expanduser("~/.local/share"), "broderie-panneau")
    return d


def _inkscape_installe():
    """Dossier « bin » d'Inkscape (où se trouve le programme inkscape), d'après le Python d'Inkscape
    qui fait tourner le panneau ; sur macOS, l'emplacement habituel."""
    if MAC:
        return "/Applications/Inkscape.app/Contents/MacOS"
    d = os.path.dirname(sys.executable)
    return d if os.path.exists(os.path.join(d, "inkscape.exe" if WINDOWS else "inkscape")) else None


def bibliotheque_inkex():
    """Dossier de la bibliothèque inkex fournie avec Inkscape."""
    if MAC:
        return "/Applications/Inkscape.app/Contents/Resources/share/inkscape/extensions"
    b = _inkscape_installe()
    return os.path.normpath(os.path.join(b, "..", "share", "inkscape", "extensions")) if b else None


def chemin_programmes(path):
    """PATH complété du dossier d'Inkscape : le rendu réaliste d'Ink/Stitch appelle « inkscape »."""
    b = _inkscape_installe()
    return b + os.pathsep + path if b else path


def sans_fenetre():
    """Options de subprocess : sous Windows, pas de fenêtre de console qui s'ouvre et se ferme."""
    return {"creationflags": 0x08000000} if WINDOWS else {}          # CREATE_NO_WINDOW


def detache():
    """Options de subprocess pour un programme qui doit survivre à l'extension (le serveur du panneau)."""
    if WINDOWS:     # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP | CREATE_NO_WINDOW
        return {"creationflags": 0x00000008 | 0x00000200 | 0x08000000}
    return {"start_new_session": True}


def python_sans_console():
    """Sous Windows, pythonw.exe (même Python, sans console) s'il est fourni avec Inkscape."""
    if WINDOWS:
        w = os.path.join(os.path.dirname(sys.executable), "pythonw.exe")
        if os.path.exists(w):
            return w
    return sys.executable


def choisir(mode):
    """Boîte de dialogue du système pour choisir un fichier ou un dossier ; renvoie le chemin
    (plusieurs fichiers : séparés par des virgules) ou None."""
    if MAC:
        script = {"folder": "choose folder", "file_new": "choose file name",
                  "files": "choose file with multiple selections allowed"}.get(mode, "choose file")
        if mode == "files":
            prog = 'set L to (%s)\nset R to ""\nrepeat with f in L\nset R to R & POSIX path of f & "|"\nend repeat\nreturn R' % script
        else:
            prog = "POSIX path of (%s)" % script
        cmd = ["/usr/bin/osascript", "-e", 'tell application "System Events" to activate', "-e", prog]
    elif WINDOWS:
        if mode == "folder":
            ps = ("$d = New-Object System.Windows.Forms.FolderBrowserDialog; "
                  "if ($d.ShowDialog() -eq 'OK') { $d.SelectedPath }")
        else:
            classe = "SaveFileDialog" if mode == "file_new" else "OpenFileDialog"
            multi = "$d.Multiselect = $true; " if mode == "files" else ""
            ps = ("$d = New-Object System.Windows.Forms.%s; %s"
                  "if ($d.ShowDialog() -eq 'OK') { $d.FileNames -join '|' }" % (classe, multi))
        cmd = ["powershell", "-NoProfile", "-STA", "-Command", "Add-Type -AssemblyName System.Windows.Forms; " + ps]
    else:
        return None
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=600, **sans_fenetre())
    except (OSError, subprocess.SubprocessError):
        return None
    r = p.stdout.strip().rstrip("|")
    return r.replace("|", ",") if r else None
