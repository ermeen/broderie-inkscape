"""Broderie pour Inkscape : appel du moteur Ink/Stitch installé.

Ink/Stitch est utilisé tel quel : on lui passe un fichier SVG et les mêmes arguments
qu'Inkscape lui passe (--extension=…, --id=…, réglages de la commande). Il renvoie un SVG
modifié (commandes d'effet) ou un fichier de broderie (export) sur sa sortie standard.
"""
import glob
import os
import subprocess
import tempfile

from lxml import etree

DOSSIERS = [
    "~/Library/Application Support/org.inkscape.Inkscape/config/inkscape/extensions",
    "~/.config/inkscape/extensions",
]


def binaire():
    env = os.environ.get("BRODERIE_INKSTITCH")
    if env and os.path.exists(env):
        return env
    for d in DOSSIERS:
        d = os.path.expanduser(d)
        for motif in ("**/inkstitch.app/Contents/MacOS/inkstitch", "**/inkstitch/bin/inkstitch", "**/bin/inkstitch"):
            for f in glob.glob(os.path.join(d, motif), recursive=True):
                if os.access(f, os.X_OK):
                    return f
    return None


def _ressources():
    b = binaire()
    return os.path.normpath(os.path.join(os.path.dirname(b), "..", "Resources")) if b else None


def fichier_traduction(langue="fr_FR"):
    r = _ressources()
    if not r:
        return None
    f = os.path.join(r, "locales", langue, "LC_MESSAGES", "inkstitch.mo")
    return f if os.path.exists(f) else None


def version():
    r = _ressources()
    try:
        if not r:
            return None
        with open(os.path.join(r, "VERSION")) as f:
            return f.read().strip()
    except OSError:
        return None


def _env():
    # l'environnement Python d'Inkscape ne doit pas déteindre sur le moteur (application autonome)
    return {k: v for k, v in os.environ.items() if not k.startswith(("PYTHON", "DYLD_", "GI_", "GTK_", "GDK_"))}


def _args(extension, ids, params):
    a = ["--extension=%s" % extension]
    for k, v in (params or {}).items():
        if v is None:
            continue
        if isinstance(v, bool):
            v = "true" if v else "false"
        a.append("--%s=%s" % (k, v))
    a += ["--id=%s" % i for i in (ids or [])]
    return a


INKSTITCH_NS = "http://inkstitch.org/namespace"
SVG_VERSION = "4"       # INKSTITCH_SVG_VERSION d'Ink/Stitch 3.3


def versionner(document):
    """Dessin sans numéro de version Ink/Stitch et sans aucun réglage Ink/Stitch : rien à
    convertir, on note la version actuelle (sinon Ink/Stitch demande « Unversioned … » à chaque
    appel). Un ancien dessin qui a des réglages est laissé tel quel : la question est alors justifiée."""
    r = document.getroot()
    cle = "{%s}inkstitch_svg_version" % INKSTITCH_NS
    if r.find(".//" + cle) is not None:
        return
    if any(isinstance(k, str) and k.startswith("{%s}" % INKSTITCH_NS)
           for el in r.iter() if isinstance(el.tag, str) for k in el.attrib):
        return
    meta = r.find("{http://www.w3.org/2000/svg}metadata")
    if meta is None:
        meta = etree.Element("{http://www.w3.org/2000/svg}metadata")
        r.insert(0, meta)
    etree.SubElement(meta, cle).text = SVG_VERSION


def ecrire_temp(document):
    d = tempfile.mkdtemp(prefix="broderie-")
    f = os.path.join(d, "dessin.svg")
    document.write(f, encoding="utf-8", xml_declaration=True)
    return f


def executer(document, extension, ids=None, params=None, attendre=True, delai=600):
    """Lance une commande Ink/Stitch sur le document. Renvoie (code, sortie bytes, erreurs str)."""
    b = binaire()
    if not b:
        return 1, b"", "Ink/Stitch est introuvable."
    f = ecrire_temp(document)
    cmd = [b] + _args(extension, ids, params) + [f]
    if not attendre:                   # fenêtre d'Ink/Stitch (simulateur…) : on ne bloque pas
        subprocess.Popen(cmd, env=_env(), cwd=os.path.dirname(f), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return 0, b"", ""
    p = subprocess.run(cmd, env=_env(), cwd=os.path.dirname(f), capture_output=True, timeout=delai)
    return p.returncode, p.stdout, p.stderr.decode("utf-8", "replace")


def document_modifie(sortie):
    """Sortie d'une commande d'effet → nouveau document (None si la commande n'a rien renvoyé)."""
    s = sortie.strip()
    if not s.startswith(b"<"):
        return None
    try:
        return etree.ElementTree(etree.fromstring(s, etree.XMLParser(huge_tree=True)))
    except etree.XMLSyntaxError:
        return None


def apercu(document, ids=None):
    """SVG autonome des points calculés par Ink/Stitch (« Aperçu du plan de broderie »)."""
    code, out, err = executer(document, "stitch_plan_preview", ids, {
        "render-mode": "simple", "move-to-side": False, "layer-visibility": "unchanged",
        "needle-points": True, "render-jumps": True, "ignore-layer": False, "overwrite": True,
        "visual-commands": False, "insensitive": False})
    doc = document_modifie(out)
    if doc is None:
        return None, err or "Aucun point généré."
    r = doc.getroot()
    plan = r.xpath("//*[@id='__inkstitch_stitch_plan__']")
    if not plan:
        return None, err or "Aucun point généré."
    svg = etree.Element("{http://www.w3.org/2000/svg}svg", nsmap={None: "http://www.w3.org/2000/svg"})
    for k in ("width", "height", "viewBox"):
        if r.get(k):
            svg.set(k, r.get(k))
    for d in r.findall("{http://www.w3.org/2000/svg}defs"):
        svg.append(d)
    svg.append(plan[0])
    return etree.tostring(svg, encoding="unicode"), err


def exporter(document, fmt, ids=None):
    code, out, err = executer(document, "output", ids, {"format": fmt})
    return (out if code == 0 and out else None), err
