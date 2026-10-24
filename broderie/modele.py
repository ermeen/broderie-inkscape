"""Broderie pour Inkscape : modèle (sans interface).

Lit et écrit les réglages Ink/Stitch d'un document SVG, exactement comme Ink/Stitch les
stocke : attributs `inkstitch:<nom>` (espace de noms http://inkstitch.org/namespace).
Aucun algorithme de broderie ici : la génération des points est confiée au moteur
Ink/Stitch installé (voir moteur.py).
"""
import gettext
import json
import os

from lxml import etree

INKSTITCH_NS = "http://inkstitch.org/namespace"
SVG_NS = "http://www.w3.org/2000/svg"
XLINK_NS = "http://www.w3.org/1999/xlink"
INKSCAPE_NS = "http://www.inkscape.org/namespaces/inkscape"
etree.register_namespace("inkstitch", INKSTITCH_NS)

ICI = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(ICI, "catalogue_inkstitch.json"), encoding="utf-8") as _f:
    CATALOGUE = json.load(_f)
FORMES = {"path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "use"}
PLAN = "__inkstitch_stitch_plan__"

# Réglages affichés directement (le reste est dans « Mode avancé »)
COURANTS = {
    "fill_stitch": ["fill_method", "angle", "row_spacing_mm", "max_stitch_length_mm", "pull_compensation_mm",
                    "fill_underlay", "expand_mm"],
    "satin_column": ["satin_method", "zigzag_spacing_mm", "pull_compensation_mm", "pull_compensation_percent",
                     "contour_underlay", "center_walk_underlay", "zigzag_underlay"],
    "stroke": ["stroke_method", "running_stitch_length_mm", "repeats", "bean_stitch_repeats", "zigzag_spacing_mm"],
    "clone": ["clone", "angle"],
    "element": ["trim_after", "stop_after", "ties"],
}
TITRES = {"fill_stitch": "Remplissage", "satin_column": "Colonne satin", "stroke": "Contour (point droit, ripple, zigzag…)",
          "clone": "Clone", "element": "Général (coupes, arrêts, points d'arrêt)"}
GROUPES = {"Fill Underlay": "Sous-couche du remplissage", "Contour Underlay": "Sous-couche contour",
           "Center-Walk Underlay": "Sous-couche centrale", "Zig-zag Underlay": "Sous-couche zigzag"}


def _traducteur():
    """Traductions françaises fournies avec Ink/Stitch (fichier .mo), sinon libellés anglais."""
    from . import moteur
    mo = moteur.fichier_traduction()
    if mo:
        try:
            with open(mo, "rb") as f:
                return gettext.GNUTranslations(f).gettext
        except OSError:
            pass
    return lambda s: s


_ = None


def tr(s):
    global _
    if _ is None:
        _ = _traducteur()
    return _(s) if s else s


def local(el):
    return etree.QName(el).localname if isinstance(el.tag, str) else ""


def attr(el, nom):
    return el.get("{%s}%s" % (INKSTITCH_NS, nom))


def booleen(v, defaut=False):
    if v is None or v == "":
        return defaut
    return str(v).strip().lower() in ("yes", "y", "true", "t", "1")


def _style(el):
    st = {}
    for part in (el.get("style") or "").split(";"):
        if ":" in part:
            k, v = part.split(":", 1)
            st[k.strip()] = v.strip()
    for k in ("fill", "stroke"):
        if k not in st and el.get(k) is not None:
            st[k] = el.get(k)
    return st


def _style_herite(el, cle):
    while el is not None and isinstance(el.tag, str):
        v = _style(el).get(cle)
        if v not in (None, "inherit"):
            return v
        el = el.getparent()
    return None


def _cache(el):
    while el is not None and isinstance(el.tag, str):
        if el.get("id") == PLAN or local(el) in ("defs", "metadata", "symbol", "clipPath", "mask", "marker"):
            return True
        if (_style(el).get("display") == "none") or el.get(f"{{{INKSTITCH_NS}}}connector-type"):
            return True
        el = el.getparent()
    return False


def nombre_sous_chemins(el):
    d = el.get("d") or ""
    return max(1, sum(1 for c in d if c in "Mm"))


def types(el):
    """Types de broderie de l'objet, dans l'ordre où Ink/Stitch les brode."""
    nom = local(el)
    if nom == "use":
        return ["clone"]
    if nom == "g":
        return ["lettrage"] if attr(el, "lettering") is not None else []
    out = []
    fill = _style_herite(el, "fill")
    if nom not in ("line", "polyline") and (fill is None or fill.lower() != "none") and booleen(attr(el, "fill"), True):
        out.append("fill_stitch")
    stroke = _style_herite(el, "stroke")
    if stroke and stroke.lower() != "none":
        out.append("satin_column" if booleen(attr(el, "satin_column")) else "stroke")
    return out


def objets(svg, ids=None):
    """Objets brodables : la sélection si elle existe, sinon tout le document (ordre de couture)."""
    racine = svg.getroot() if hasattr(svg, "getroot") else svg
    out = []
    for el in racine.iter():
        if not isinstance(el.tag, str):
            continue
        nom = local(el)
        if nom not in FORMES and not (nom == "g" and attr(el, "lettering") is not None):
            continue
        if _cache(el) or any(attr(a, "lettering") is not None for a in el.iterancestors()):
            continue
        if ids and el.get("id") not in ids:
            continue
        t = types(el)
        if t:
            out.append(el)
    return out


def couleur(el):
    for k in ("fill", "stroke"):
        v = _style_herite(el, k)
        if v and v.lower() != "none" and not v.startswith("url("):
            return v
    return "#000000"


def decrire(el):
    t = types(el)
    return {
        "id": el.get("id"),
        "nom": (el.get("{%s}label" % INKSCAPE_NS) or "").strip() not in ("", "None") and el.get("{%s}label" % INKSCAPE_NS).strip() or el.get("id"),
        "balise": local(el),
        "types": t,
        "couleur": couleur(el),
        "remplissage": _style_herite(el, "fill"),
        "contour": _style_herite(el, "stroke"),
        "sous_chemins": nombre_sous_chemins(el) if local(el) == "path" else 1,
        "valeurs": {etree.QName(k).localname: v for k, v in el.attrib.items() if k.startswith("{%s}" % INKSTITCH_NS)},
    }


def schema():
    """Paramètres Ink/Stitch par type, avec libellés traduits et rang « courant » ou « avancé »."""
    out = {}
    for typ, params in CATALOGUE["parametres"].items():
        lst = []
        for p in params:
            q = dict(p)
            q["libelle"] = tr(p.get("label", "")) or p["name"]
            q["aide"] = tr(p.get("tooltip", "")) if isinstance(p.get("tooltip"), str) else ""
            q["unite"] = tr(p.get("unit", "")) if isinstance(p.get("unit"), str) else ""
            q["groupe"] = GROUPES.get(p.get("group"), p.get("group") or "")
            q["courant"] = p["name"] in COURANTS.get(typ, [])
            if p["name"] == "meander_pattern":            # liste construite par Ink/Stitch à partir de ses motifs
                from . import moteur
                tuiles = moteur.motifs_meandre()
                q["options"] = [t["id"] for t in tuiles]
                q["options_libelles"] = [t["nom"] for t in tuiles]
                q["apercus"] = [t["dossier"] for t in tuiles]
            elif isinstance(p.get("options"), list):
                q["options_libelles"] = [tr(_libelle_option(o)) for o in p["options"]]
            lst.append(q)
        out[typ] = {"titre": TITRES.get(typ, typ), "params": lst}
    return out


_OPTIONS = {"tatami_fill": "Tatami Fill", "circular_fill": "Circular Fill", "contour_fill": "Contour Fill",
            "cross_stitch": "Cross Stitch", "guided_fill": "Guided Fill", "linear_gradient_fill": "Linear Gradient Fill",
            "meander_fill": "Meander Fill", "tartan_fill": "Tartan Fill", "legacy_fill": "Legacy Fill",
            "flexible": "Flexible", "flexible_stagger": "Flexible (stagger)", "simple_cross": "Cross",
            "simple_cross_flipped": "Cross Flipped", "half_cross": "Half Cross", "half_cross_flipped": "Half Cross Flipped",
            "upright_cross": "Upright Cross", "upright_cross_flipped": "Upright Cross Flipped",
            "dense_upright_cross": "Dense Upright Cross", "dense_upright_cross_flipped": "Dense Upright Cross Flipped",
            "double_cross": "Double Cross", "double_cross_flipped": "Double Cross Flipped", "smyrna_cross": "Smyrna Cross",
            "smyrna_cross_flipped": "Smyrna Cross Flipped", "satin_column": "Satin Column", "e_stitch": '"E" Stitch',
            "s_stitch": '"S" Stitch', "zigzag": "Zig-zag", "default": "Default", "simple": "Simple",
            "staggered": "Staggered", "automatic": "Automatic", "none": "Don't reverse", "first": "Reverse first rail",
            "second": "Reverse second rail", "both": "Reverse both rails",
            "running_stitch": "Running Stitch / Bean Stitch", "ripple_stitch": "Ripple Stitch",
            "zigzag_stitch": "ZigZag Stitch", "manual_stitch": "Manual Stitch",
            "render_at_rungs": "Render at rungs", "adaptive": "Adaptive + minimum line distance"}


def _libelle_option(o):
    return _OPTIONS.get(o, str(o))


def commandes():
    """Commandes Ink/Stitch (effets) avec noms, menus, libellés et choix traduits."""
    out = []
    for c in CATALOGUE["commandes"]:
        if c["type"] != "effect":
            continue
        q = dict(c)
        q["nom_fr"] = tr(c["nom"])
        sous = (c["menu"] or "").replace("Ink/Stitch", "", 1).strip("/")
        q["menu_fr"] = " › ".join(tr(m) for m in sous.split("/") if m) or "Ink/Stitch"
        ps = []
        for p in c["params"]:
            p = dict(p)
            p["libelle"] = tr(p.get("label") or "") or p["name"]
            p["aide_fr"] = tr(p.get("aide") or "")
            p["page_fr"] = tr(p.get("page") or "")
            if p.get("options_libelles"):
                p["options_libelles"] = [tr(x) for x in p["options_libelles"]]
            ps.append(p)
        q["params"] = ps
        out.append(q)
    return out


def par_id(svg, i):
    racine = svg.getroot() if hasattr(svg, "getroot") else svg
    # parcours simple : racine.xpath() d'inkex n'accepte pas les variables XPath
    return next((el for el in racine.iter() if isinstance(el.tag, str) and el.get("id") == i), None)


def ecrire(el, valeurs):
    """Écrit les réglages : None ou "" supprime l'attribut (valeur par défaut d'Ink/Stitch)."""
    for nom, v in valeurs.items():
        cle = "{%s}%s" % (INKSTITCH_NS, nom)
        if v is None or v == "":
            el.attrib.pop(cle, None)
        elif isinstance(v, bool):
            el.set(cle, "True" if v else "False")
        else:
            el.set(cle, str(v))


def changer_couleur(el, quoi, valeur):
    st = _style(el)
    st[quoi] = valeur
    if el.get(quoi) is not None:
        del el.attrib[quoi]
    el.set("style", ";".join(f"{k}:{v}" for k, v in st.items()))


def deplacer(el, sens):
    """Ordre de couture = ordre du document : -1 = plus tôt, +1 = plus tard (parmi les frères)."""
    parent = el.getparent()
    freres = [f for f in parent if isinstance(f.tag, str)]
    i = freres.index(el)
    j = i + sens
    if 0 <= j < len(freres):
        parent.remove(el)
        cible = freres[j]
        if sens < 0:
            cible.addprevious(el)
        else:
            cible.addnext(el)
        return True
    return False


def contour_svg(svg, i):
    """Contour de l'objet i (avec les transformations de ses groupes parents), à superposer à l'aperçu
    des points pour montrer ce qui est sélectionné."""
    import copy
    el = par_id(svg, i)
    if el is None:
        return None
    c = copy.deepcopy(el)
    for x in c.iter():
        if isinstance(x.tag, str):
            for k in [k for k in x.attrib if k.startswith("{%s}" % INKSTITCH_NS) or k in ("style", "fill", "stroke", "id")]:
                del x.attrib[k]
    racine = svg.getroot() if hasattr(svg, "getroot") else svg
    for parent in el.iterancestors():
        if parent is racine:
            break
        if parent.get("transform"):
            g = etree.Element("{%s}g" % SVG_NS)
            g.set("transform", parent.get("transform"))
            g.append(c)
            c = g
    g = etree.Element("{%s}g" % SVG_NS, nsmap={None: SVG_NS})
    g.set("class", "selection-panneau")
    g.append(c)
    return etree.tostring(g, encoding="unicode")


def _inkex():
    """Bibliothèque d'Inkscape (chemins et transformations), fournie avec Inkscape."""
    import sys
    p = "/Applications/Inkscape.app/Contents/Resources/share/inkscape/extensions"
    if os.path.isdir(p) and p not in sys.path:
        sys.path.append(p)
    import inkex
    return inkex


def _chemin(el):
    """Tracé de l'élément dans le repère de son parent (sa propre transformation appliquée)."""
    ix = _inkex()
    p = ix.paths.Path(el.get("d") or "")
    if el.get("transform"):
        p = p.transform(ix.transforms.Transform(el.get("transform")))
    return p


def _boite(el, marge=0.0):
    try:
        b = _chemin(el).bounding_box()
    except Exception:
        return None
    return (b.left - marge, b.top - marge, b.right + marge, b.bottom + marge) if b else None


def traverses_possibles(svg, i):
    """Traits (chemins) du même groupe qui touchent la colonne : rails ou traverses à assembler."""
    el = par_id(svg, i)
    if el is None or local(el) != "path":
        return []
    b = _boite(el, 1.0)
    if not b:
        return []
    out = []
    for f in el.getparent():
        if f is el or not isinstance(f.tag, str) or local(f) != "path" or "stroke" not in types(f):
            continue
        c = _boite(f)
        if c and c[0] <= b[2] and c[2] >= b[0] and c[1] <= b[3] and c[3] >= b[1]:
            out.append(f.get("id"))
    return out


def assembler_satin(svg, ids):
    """Réunit rails et traverses en un seul chemin colonne satin (comme Chemin › Combiner d'Inkscape)."""
    els = [par_id(svg, i) for i in ids]
    els = [e for e in els if e is not None and local(e) == "path"]
    if len(els) < 2:
        raise ValueError("Choisissez au moins deux traits à assembler.")
    if len({id(e.getparent()) for e in els}) > 1:
        raise ValueError("Ces traits sont dans des groupes différents : réunissez-les dans Inkscape (Chemin › Combiner, ⌘K).")
    premier = els[0]
    d = " ".join(str(_chemin(e)) for e in els)
    premier.set("d", d)
    premier.attrib.pop("transform", None)
    premier.set("{%s}satin_column" % INKSTITCH_NS, "True")
    for e in els[1:]:
        e.getparent().remove(e)
    return premier.get("id")


def _tracé(el):
    """Contour d'une forme SVG simple sous forme de tracé (pour calculer son encombrement)."""
    n, f = local(el), lambda k: float(el.get(k) or 0)
    if n == "path":
        return el.get("d") or ""
    if n == "rect":
        x, y, w, h = f("x"), f("y"), f("width"), f("height")
        return "M %g,%g h %g v %g h %g Z" % (x, y, w, h, -w)
    if n in ("circle", "ellipse"):
        cx, cy = f("cx"), f("cy")
        rx = f("r") or f("rx")
        ry = f("r") or f("ry")
        return "M %g,%g h %g v %g h %g Z" % (cx - rx, cy - ry, 2 * rx, 2 * ry, -2 * rx)
    if n in ("polygon", "polyline"):
        return "M " + (el.get("points") or "0,0")
    if n == "line":
        return "M %g,%g L %g,%g" % (f("x1"), f("y1"), f("x2"), f("y2"))
    return ""


def page_et_centre(svg, ids=None):
    """Taille de la page (mm) et centre des objets brodés : Ink/Stitch exporte les points centrés sur le motif,
    ceci permet de replacer la page autour d'eux (« Afficher la page » du simulateur)."""
    ix = _inkex()
    racine = svg.getroot() if hasattr(svg, "getroot") else svg
    vb = [float(x) for x in (racine.get("viewBox") or "0 0 0 0").replace(",", " ").split()]
    def mm(v):
        try:
            return ix.units.convert_unit(v, "mm") if v else None
        except Exception:
            return None
    w, h = mm(racine.get("width")), mm(racine.get("height"))
    kx = (w / vb[2]) if w and len(vb) == 4 and vb[2] else 1.0
    ky = (h / vb[3]) if h and len(vb) == 4 and vb[3] else kx
    boite = None
    for el in objets(svg, ids):
        try:
            t = ix.transforms.Transform()
            for a in reversed(list(el.iterancestors())):
                if a.get("transform"):
                    t = t @ ix.transforms.Transform(a.get("transform"))
            b = ix.paths.Path(_tracé(el)).transform(t @ ix.transforms.Transform(el.get("transform") or "")).bounding_box()
            boite = b if boite is None else boite + b
        except Exception:
            continue
    if boite is None:
        return None
    x0 = vb[0] if len(vb) == 4 else 0
    y0 = vb[1] if len(vb) == 4 else 0
    return {"largeur": w or (vb[2] if len(vb) == 4 else 0), "hauteur": h or (vb[3] if len(vb) == 4 else 0),
            "cx": ((boite.left + boite.right) / 2 - x0) * kx, "cy": ((boite.top + boite.bottom) / 2 - y0) * ky}
