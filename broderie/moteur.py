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

from . import systeme as S


def _dossiers():
    return [os.path.join(S.profil_inkscape(), "extensions"), os.path.expanduser("~/.config/inkscape/extensions")]


def binaire():
    env = os.environ.get("BRODERIE_INKSTITCH")
    if env and os.path.exists(env):
        return env
    for d in _dossiers():
        for motif in ("**/inkstitch.app/Contents/MacOS/inkstitch", "**/inkstitch/bin/inkstitch.exe",
                      "**/inkstitch/bin/inkstitch", "**/bin/inkstitch.exe", "**/bin/inkstitch"):
            for f in glob.glob(os.path.join(d, motif), recursive=True):
                if os.access(f, os.X_OK):
                    return f
    return None


def ressources():
    """Dossier des fichiers d'Ink/Stitch (polices, palettes, icônes…) : « Resources » de l'application
    sur macOS, dossier « inkstitch » sous Windows et Linux."""
    b = binaire()
    if not b:
        return None
    for d in (os.path.join(os.path.dirname(b), "..", "Resources"), os.path.join(os.path.dirname(b), "..")):
        d = os.path.normpath(d)
        if any(os.path.exists(os.path.join(d, x)) for x in ("VERSION", "fonts", "palettes")):
            return d
    return None


def fichier_traduction(langue="fr_FR"):
    r = ressources()
    if not r:
        return None
    f = os.path.join(r, "locales", langue, "LC_MESSAGES", "inkstitch.mo")
    return f if os.path.exists(f) else None


def version():
    r = ressources()
    try:
        if not r:
            return None
        with open(os.path.join(r, "VERSION")) as f:
            return f.read().strip()
    except OSError:
        return None


def _env():
    # l'environnement Python d'Inkscape ne doit pas déteindre sur le moteur (application autonome)
    env = {k: v for k, v in os.environ.items() if not k.startswith(("PYTHON", "DYLD_", "GI_", "GTK_", "GDK_"))}
    # le rendu réaliste en image appelle « inkscape » : on lui indique où il se trouve
    env["PATH"] = S.chemin_programmes(env.get("PATH", os.defpath))
    return env


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


def ancien(document):
    """Dessin avec des réglages Ink/Stitch mais sans numéro de version : Ink/Stitch ouvrirait sa fenêtre
    « Unversioned Ink/Stitch SVG file » et attendrait une réponse."""
    r = document.getroot()
    if r.find(".//{%s}inkstitch_svg_version" % INKSTITCH_NS) is not None:
        return False
    return any(isinstance(k, str) and k.startswith("{%s}" % INKSTITCH_NS)
               for el in r.iter() if isinstance(el.tag, str) for k in el.attrib)


def marquer_a_jour(document):
    """Note la version actuelle du format Ink/Stitch (le dessin est déclaré récent par l'utilisateur)."""
    r = document.getroot()
    if r.find(".//{%s}inkstitch_svg_version" % INKSTITCH_NS) is not None:
        return
    meta = r.find("{http://www.w3.org/2000/svg}metadata")
    if meta is None:
        meta = etree.Element("{http://www.w3.org/2000/svg}metadata")
        r.insert(0, meta)
    etree.SubElement(meta, "{%s}inkstitch_svg_version" % INKSTITCH_NS).text = SVG_VERSION


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
    if ancien(document):
        return 1, b"", ("Dessin d'une ancienne version d'Ink/Stitch : à mettre à jour d'abord (bandeau en haut du panneau).")
    f = ecrire_temp(document)
    cmd = [b] + _args(extension, ids, params) + [f]
    if not attendre:                   # fenêtre d'Ink/Stitch (simulateur…) : on ne bloque pas
        subprocess.Popen(cmd, env=_env(), cwd=os.path.dirname(f), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                         **S.sans_fenetre())
        return 0, b"", ""
    try:
        p = subprocess.run(cmd, env=_env(), cwd=os.path.dirname(f), capture_output=True, timeout=delai, **S.sans_fenetre())
    except subprocess.TimeoutExpired:      # le moteur est arrêté par subprocess
        return 1, b"", "Ink/Stitch n'a pas répondu à temps (une fenêtre d'Ink/Stitch attend peut-être une réponse)."
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


MODES = {"points": "simple", "realiste": "realistic-600"}   # le rendu vectoriel demandait trop de mémoire


def apercu(document, ids=None, mode="points", options=None):
    """SVG autonome des points calculés par Ink/Stitch (« Aperçu du plan de broderie »)."""
    code, out, err = executer(document, "stitch_plan_preview", ids, {
        "render-mode": MODES.get(mode, "simple"), "move-to-side": False, "layer-visibility": "unchanged",
        "needle-points": mode == "points" and (options or {}).get("penetrations", True),
        "render-jumps": mode == "points" and (options or {}).get("sauts", True), "ignore-layer": False, "overwrite": True,
        # pas de symboles de commande : avec eux, Ink/Stitch ouvre une fenêtre de message et attend
        "visual-commands": False, "insensitive": False}, delai=90)
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
    import re
    # « ns1:href » (préfixe quelconque) n'est pas compris par le navigateur : « href » simple (SVG 2)
    return re.sub(r'\s[\w.-]+:href=', ' href=', etree.tostring(svg, encoding="unicode")), err


def importer(chemin):
    """Fichier de broderie (.pes, .dst, .jef…) → dessin Inkscape en points manuels (import d'Ink/Stitch)."""
    b = binaire()
    if not b:
        return None, "Ink/Stitch est introuvable."
    try:
        p = subprocess.run([b, "--extension=input", chemin], env=_env(), capture_output=True, timeout=180, **S.sans_fenetre())
    except subprocess.TimeoutExpired:
        return None, "Ink/Stitch n'a pas répondu à temps."
    return document_modifie(p.stdout), p.stderr.decode("utf-8", "replace")


def exporter(document, fmt, ids=None):
    code, out, err = executer(document, "output", ids, {"format": fmt})
    return (out if code == 0 and out else None), err


def points(document, ids=None):
    """Liste des points calculés par Ink/Stitch (export JSON) : pour le simulateur intégré au panneau.
    Coordonnées en 0,1 mm centrées sur le dessin ; commandes STITCH, JUMP, TRIM, COLOR_CHANGE, STOP, END."""
    import json
    code, data, err = executer(document, "output", ids, {"format": "json"}, delai=120)
    data = data if code == 0 and data else None
    if not data:
        return None, err
    d = json.loads(data)
    return {"fils": [t.get("color") or "#000000" for t in d.get("threadlist", [])],
            "points": [[round(x, 1), round(y, 1), c.split()[0]] for x, y, c in d.get("stitches", [])]}, err


def polices():
    """Polices de lettrage fournies avec Ink/Stitch (nom, description, échelle permise, aperçu)."""
    import json
    import lzma
    r = ressources()
    out = []
    if not r:
        return out
    base = os.path.join(r, "fonts", "src")
    for d in sorted(os.listdir(base)) if os.path.isdir(base) else []:
        f = os.path.join(base, d, "font.json.xz")
        if not os.path.exists(f):
            f = os.path.join(base, d, "font.json")
            if not os.path.exists(f):
                continue
        try:
            with (lzma.open(f, "rt", encoding="utf-8") if f.endswith(".xz") else open(f, encoding="utf-8")) as fh:
                j = json.load(fh)
        except (OSError, ValueError, lzma.LZMAError):
            continue
        out.append({"id": d, "nom": j.get("name") or d, "description": j.get("description") or "",
                    "min": j.get("min_scale", 1), "max": j.get("max_scale", 1), "taille": j.get("size"),
                    "apercu": os.path.exists(os.path.join(base, d, "preview.png"))})
    return out


def apercu_police(ident):
    r = ressources()
    f = os.path.normpath(os.path.join(r or "", "fonts", "src", ident, "preview.png"))
    return f if r and f.startswith(os.path.join(r, "fonts", "src")) and os.path.exists(f) else None


def lettrage(document, params):
    """Texte brodé sans fenêtre : commande « Lettrage par lots » d'Ink/Stitch, sortie SVG, qui renvoie
    le dessin complété du groupe de lettrage (même format que l'outil Lettrage)."""
    import io
    import zipfile
    p = dict(params)
    p["file-formats"] = "svg"
    p.setdefault("separator", "\u00a7\u00a7\u00a7")   # sinon chaque ligne devient un texte séparé
    code, out, err = executer(document, "batch_lettering", None, p)
    if not out or not out.startswith(b"PK"):
        return None, err
    with zipfile.ZipFile(io.BytesIO(out)) as z:
        noms = [n for n in z.namelist() if n.endswith(".svg")]
        if not noms:
            return None, err
        return etree.ElementTree(etree.fromstring(z.read(noms[0]), etree.XMLParser(huge_tree=True))), err


def motifs_meandre():
    """Motifs du remplissage « Méandre » fournis avec Ink/Stitch (identifiant, nom, aperçu)."""
    import json
    r = ressources()
    base = os.path.join(r, "tiles") if r else None
    out = []
    for d in os.listdir(base) if base and os.path.isdir(base) else []:
        try:
            with open(os.path.join(base, d, "tile.json"), encoding="utf-8") as f:
                j = json.load(f)
        except (OSError, ValueError):
            continue
        out.append({"id": j.get("id") or d, "nom": j.get("name") or d, "dossier": d})
    return sorted(out, key=lambda t: t["nom"])


def apercu_motif(dossier):
    r = ressources()
    f = os.path.normpath(os.path.join(r or "", "tiles", dossier, "preview.png"))
    return f if r and f.startswith(os.path.join(r, "tiles")) and os.path.exists(f) else None


def icone(nom):
    """Icônes du simulateur d'Ink/Stitch (saut = grenouille, coupe = ciseaux, arrêt, bobine…)."""
    r = ressources()
    f = os.path.normpath(os.path.join(r or "", "icons", nom))
    return f if r and f.startswith(os.path.join(r, "icons")) and f.endswith(".png") and os.path.exists(f) else None


SEUILS_DENSITE = ("num-neighbors-red", "density-radius-red", "num-neighbors-yellow", "density-radius-yellow")


def densite(document, ids=None, seuils=None):
    """Carte de densité d'Ink/Stitch (points rouges : trop dense, jaunes : limite, verts : correct),
    calculée sur une copie : on n'en garde que le calque de repères, à superposer à l'aperçu.
    seuils : nombre de points voisins et rayon (mm) pour le rouge et le jaune (sinon ceux d'Ink/Stitch)."""
    params = {"layer-visibility": "0"}
    params.update({k: str(v) for k, v in (seuils or {}).items() if k in SEUILS_DENSITE and v not in (None, "")})
    code, out, err = executer(document, "density_map", ids, params, delai=120)
    doc = document_modifie(out)
    if doc is None:
        return None, err
    plan = doc.getroot().xpath("//*[@id='__inkstitch_density_plan__']")
    if not plan:
        return None, err
    plan[0].set("class", "densite-panneau")
    return etree.tostring(plan[0], encoding="unicode"), err
