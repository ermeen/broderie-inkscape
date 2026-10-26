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

from . import systeme as S

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


def _cache(el, masques=False):
    """Hors broderie : définitions, aperçu, connecteurs… et objets masqués (sauf si masques=True)."""
    while el is not None and isinstance(el.tag, str):
        if el.get("id") == PLAN or local(el) in ("defs", "metadata", "symbol", "clipPath", "mask", "marker"):
            return True
        if (not masques and _style(el).get("display") == "none") or el.get(f"{{{INKSTITCH_NS}}}connector-type"):
            return True
        el = el.getparent()
    return False


def completer_ids(svg):
    """Donne un id aux formes qui n'en ont pas (créées par une commande Ink/Stitch, ex. Remplissage en satin) :
    sans id, le panneau ne peut ni les choisir ni les régler."""
    racine = svg.getroot() if hasattr(svg, "getroot") else svg
    pris = {el.get("id") for el in racine.iter() if isinstance(el.tag, str) and el.get("id")}
    n = 0
    for el in racine.iter():
        if not isinstance(el.tag, str) or el.get("id") or local(el) not in (
                "path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "g", "use", "text"):
            continue
        while True:
            n += 1
            i = "%s%d" % (local(el), n)
            if i not in pris:
                break
        el.set("id", i)
        pris.add(i)


def masque(el):
    """Masqué dans Inkscape (lui ou un de ses calques) : Ink/Stitch ne le brode pas."""
    while el is not None and isinstance(el.tag, str):
        if _style(el).get("display") == "none":
            return True
        el = el.getparent()
    return False


def montrer(svg, i, visible):
    """Œil du panneau : affiche ou masque un objet ou un calque (style display, comme Inkscape)."""
    el = par_id(svg, i)
    if el is None:
        return False
    st = _style(el)
    if visible:
        st.pop("display", None)
    else:
        st["display"] = "none"
    el.set("style", ";".join("%s:%s" % (k, v) for k, v in st.items()))
    return True


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


def objets(svg, ids=None, masques=False):
    """Objets brodables : la sélection si elle existe, sinon tout le document (ordre de couture).
    masques=True : y compris les objets masqués (liste du panneau, pour pouvoir les réafficher)."""
    racine = svg.getroot() if hasattr(svg, "getroot") else svg
    out = []
    for el in racine.iter():
        if not isinstance(el.tag, str):
            continue
        nom = local(el)
        if nom not in FORMES and not (nom == "g" and attr(el, "lettering") is not None):
            continue
        if _cache(el, masques) or any(attr(a, "lettering") is not None for a in el.iterancestors()):
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


def calque(el):
    """Calque Inkscape (groupe de type « layer ») le plus proche : (identifiant, nom)."""
    for a in el.iterancestors():
        if isinstance(a.tag, str) and a.get("{%s}groupmode" % INKSCAPE_NS) == "layer":
            return a.get("id"), (a.get("{%s}label" % INKSCAPE_NS) or a.get("id") or "Calque")
    return None, "Sans calque"


def decrire(el):
    t = types(el)
    cid, cnom = calque(el)
    return {
        "id": el.get("id"),
        "nom": (el.get("{%s}label" % INKSCAPE_NS) or "").strip() not in ("", "None") and el.get("{%s}label" % INKSCAPE_NS).strip() or el.get("id"),
        "balise": local(el),
        "types": t,
        "couleur": couleur(el),
        "remplissage": _style_herite(el, "fill"),
        "contour": _style_herite(el, "stroke"),
        "sous_chemins": nombre_sous_chemins(el) if local(el) == "path" else 1,
        "arc": el.get("data-broderie-arc"),
        "trace": el.get("data-broderie-trace"), "position": el.get("data-broderie-position"),
        "calque": cid, "calque_nom": cnom, "masque": masque(el),
        "calque_masque": bool(cid) and masque(par_id(el.getroottree(), cid)),
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
    p = S.bibliotheque_inkex()
    if p and os.path.isdir(p) and p not in sys.path:
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


def emprise(svg, ids=None):
    """Emprise des objets brodés en unités du dessin (x0, y0, x1, y1), transformations comprises."""
    ix = _inkex()
    boite = None
    formes = []
    for el in objets(svg, ids):                  # un texte brodé est un groupe : on mesure ses lettres
        formes += [f for f in el.iter() if isinstance(f.tag, str) and local(f) in FORMES - {"use"}] if local(el) == "g" else [el]
    for el in formes:
        try:
            t = ix.transforms.Transform()
            for a in reversed(list(el.iterancestors())):
                if a.get("transform"):
                    t = t @ ix.transforms.Transform(a.get("transform"))
            b = ix.paths.Path(_tracé(el)).transform(t @ ix.transforms.Transform(el.get("transform") or "")).bounding_box()
            boite = b if boite is None else boite + b
        except Exception:
            continue
    return (boite.left, boite.top, boite.right, boite.bottom) if boite else None


def appliquer_cadre(svg, largeur, hauteur, centrer=True, page=True):
    """Le cadre de la brodeuse devient la page d'Inkscape (largeur × hauteur en mm) ; le motif est centré dessus.
    L'échelle du dessin (unités par mm) est conservée."""
    ix = _inkex()
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    vb = [float(x) for x in (r.get("viewBox") or "").replace(",", " ").split()] or None
    try:
        w_mm = ix.units.convert_unit(r.get("width"), "mm") if r.get("width") else None
    except Exception:
        w_mm = None
    u = (vb[2] / w_mm) if vb and len(vb) == 4 and w_mm else 1.0          # unités du dessin par mm
    x0, y0 = (vb[0], vb[1]) if vb and len(vb) == 4 else (0.0, 0.0)
    if page:
        r.set("width", "%gmm" % largeur)
        r.set("height", "%gmm" % hauteur)
        r.set("viewBox", "%g %g %g %g" % (x0, y0, largeur * u, hauteur * u))
    if centrer:
        b = emprise(svg)
        if b:
            dx = x0 + (largeur * u - (b[2] - b[0])) / 2 - b[0]
            dy = y0 + (hauteur * u - (b[3] - b[1])) / 2 - b[1]
            for enfant in r:
                if isinstance(enfant.tag, str) and local(enfant) in FORMES | {"g"} and local(enfant) != "defs":
                    t = enfant.get("transform") or ""
                    enfant.set("transform", ("translate(%g,%g) %s" % (dx, dy, t)).strip())


def placer(svg, i, cible, apres=False):
    """Déplace l'objet ou le calque i juste avant (ou après) cible — même geste que glisser dans Inkscape.
    L'ordre du document est l'ordre de couture. Si cible est un calque et i un objet, i va au début du calque."""
    el, ci = par_id(svg, i), par_id(svg, cible)
    if el is None or ci is None or el is ci or ci in el.iterancestors():
        return False
    est_calque = lambda x: x.get("{%s}groupmode" % INKSCAPE_NS) == "layer"
    if est_calque(ci) and not est_calque(el):
        el.getparent().remove(el)
        ci.insert(0, el)
        return True
    el.getparent().remove(el)
    if apres:
        ci.addnext(el)
    else:
        ci.addprevious(el)
    return True


def chemin_arc(largeur, cx, y_base, courbure):
    """Tracé en arc pour courber un texte : longueur égale à la largeur du texte (il garde sa taille).
    courbure de -100 à 100 : positive = arc vers le haut (arc-en-ciel), négative = vers le bas (sourire) ;
    à ±100, l'arc fait presque un cercle complet (340°)."""
    import math
    theta = math.radians(340) * min(1.0, abs(courbure) / 100.0)
    if theta < 1e-3 or largeur <= 0:
        return "M %g,%g L %g,%g" % (cx - largeur / 2, y_base, cx + largeur / 2, y_base)
    r = largeur / theta
    haut = courbure > 0
    cy = y_base + r if haut else y_base - r
    pts = []
    for k in range(73):
        phi = -theta / 2 + theta * k / 72
        x = cx + r * math.sin(phi)
        y = cy - r * math.cos(phi) if haut else cy + r * math.cos(phi)
        pts.append("%.3f,%.3f" % (x, y))
    return "M " + " L ".join(pts)


def trace_absolu(svg, i):
    """Tracé de l'objet i dans le repère du dessin (transformations de l'objet et de ses groupes appliquées) :
    sert de guide pour courber un texte le long d'une courbe dessinée dans Inkscape."""
    ix = _inkex()
    el = par_id(svg, i)
    if el is None or not _tracé(el):
        return None
    t = ix.transforms.Transform()
    for a in reversed(list(el.iterancestors())):
        if a.get("transform"):
            t = t @ ix.transforms.Transform(a.get("transform"))
    return str(ix.paths.Path(_tracé(el)).transform(t @ ix.transforms.Transform(el.get("transform") or "")).to_absolute())


def dessin_vide(svg):
    """Copie du dessin sans ses objets (même page, mêmes définitions) : pour essayer un texte à part."""
    import copy
    r = copy.deepcopy(svg.getroot() if hasattr(svg, "getroot") else svg)
    for enfant in list(r):
        if isinstance(enfant.tag, str) and local(enfant) not in ("defs", "metadata", "namedview"):
            r.remove(enfant)
    return etree.ElementTree(r)


def mm_par_unite(svg):
    """Millimètres par unité du dessin (viewBox)."""
    ix = _inkex()
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    vb = [float(x) for x in (r.get("viewBox") or "").replace(",", " ").split()]
    try:
        w = ix.units.convert_unit(r.get("width"), "mm") if r.get("width") else None
    except Exception:
        w = None
    return (w / vb[2]) if w and len(vb) == 4 and vb[2] else 1.0


# ---------------------------------------------------------------- bobines : nuanciers des fabricants de fil
# Les nuanciers d'Ink/Stitch (fichiers .gpl : rouge vert bleu, nom, numéro), ceux installés dans Inkscape
# (avec les palettes personnelles) en premier.
def _dossiers_palettes(ressources=None):
    d = [os.path.join(S.profil_inkscape(), "palettes")]
    if ressources:
        d.append(os.path.join(ressources, "palettes"))
    return [x for x in d if os.path.isdir(x)]


def palettes(ressources=None):
    """Noms des nuanciers de fil disponibles (« Madeira Rayon », « Isacord Polyester »…) → chemin du fichier."""
    r = {}
    for d in _dossiers_palettes(ressources):
        for f in sorted(os.listdir(d)):
            if f.startswith("InkStitch ") and f.endswith(".gpl"):
                r.setdefault(f[len("InkStitch "):-4], os.path.join(d, f))
    return dict(sorted(r.items(), key=lambda x: x[0].lower()))


def lire_palette(chemin):
    """Bobines d'un nuancier : [{couleur, nom, numero}]."""
    import re
    fils = []
    with open(chemin, encoding="utf-8", errors="replace") as f:
        for ligne in f:
            m = re.match(r"\s*(\d+)\s+(\d+)\s+(\d+)\s+(.*?)\s+(\S+)\s*$", ligne)
            if m:
                fils.append({"couleur": "#%02x%02x%02x" % tuple(int(v) for v in m.groups()[:3]),
                             "nom": m.group(4).strip(), "numero": m.group(5)})
    return fils


def _lab(c):
    """Couleur #rrggbb dans l'espace CIE Lab (écart perçu par l'œil)."""
    def lin(v):
        return ((v + 0.055) / 1.055) ** 2.4 if v > 0.04045 else v / 12.92
    r, g, b = (lin(int(c[i:i + 2], 16) / 255) for i in (1, 3, 5))
    x = (r * .4124 + g * .3576 + b * .1805) / .95047
    y = r * .2126 + g * .7152 + b * .0722
    z = (r * .0193 + g * .1192 + b * .9505) / 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def ecart(c1, c2):
    import math
    return math.dist(_lab(c1), _lab(c2))


def hex6(c):
    """« #abc », « #AABBCC », « red »… → « #aabbcc » (None si illisible)."""
    c = (c or "").strip().lower()
    noms = {"black": "#000000", "white": "#ffffff", "red": "#ff0000", "green": "#008000", "blue": "#0000ff"}
    c = noms.get(c, c)
    if len(c) == 4 and c.startswith("#"):
        c = "#" + "".join(x * 2 for x in c[1:])
    return c if len(c) == 7 and c.startswith("#") else None


def fils_du_dessin(svg):
    """Couleurs de fil dans l'ordre de couture (ordre du dessin), avec les objets qui les utilisent."""
    ordre = {}
    for el in objets(svg):
        if local(el) == "g":                         # texte brodé : les couleurs de ses lettres
            formes = [f for f in el.iter() if isinstance(f.tag, str) and local(f) in FORMES and not _cache(f)]
        else:
            formes = [el]
        for f in formes:
            c = hex6(couleur(f))
            if c:
                o = ordre.setdefault(c, [])
                nom = decrire(el)["nom"]
                if nom not in o:
                    o.append(nom)
    return [{"couleur": c, "objets": o} for c, o in ordre.items()]


def remplacer_couleurs(svg, correspondances):
    """Remplace des couleurs de fil dans tout le dessin ({ancienne: nouvelle}), styles hérités compris :
    c'est « Appliquer une palette » d'Ink/Stitch, avec les bobines choisies dans le panneau."""
    corr = {hex6(a): hex6(n) for a, n in correspondances.items() if hex6(a) and hex6(n)}
    n = 0
    racine = svg.getroot() if hasattr(svg, "getroot") else svg
    for el in racine.iter():
        if not isinstance(el.tag, str) or _cache(el, masques=True):
            continue
        st = _style(el)
        change = False
        for k in ("fill", "stroke"):                 # _style lit aussi les attributs fill= et stroke=
            if hex6(st.get(k)) in corr:
                st[k] = corr[hex6(st[k])]
                change = True
                el.attrib.pop(k, None)
        if change:
            el.set("style", ";".join(f"{k}:{v}" for k, v in st.items()))
            n += 1
    return n


# ---------------------------------------------------------------- bâti : faufilage autour du motif
# Un rectangle aux angles arrondis, brodé en premier au point droit long (fixe le tissu sur le
# stabilisateur), dans sa couleur (la machine s'arrête pour le fil de bâti), puis coupé.
BATI = "broderie_bati"
BATI_DEFAUT = {"ecart": 10.0, "longueur": 5.0, "arrondi": 6.0}


def reglages_bati(svg):
    """Réglages du bâti présent dans le dessin (None s'il n'y en a pas)."""
    el = par_id(svg, BATI)
    if el is None:
        return None
    try:
        return dict(BATI_DEFAUT, **json.loads(el.get("data-broderie-bati") or "{}"))
    except ValueError:
        return dict(BATI_DEFAUT)


def appliquer_bati(svg, actif, ecart=10.0, longueur=5.0, arrondi=6.0, cadre_largeur=None, cadre_hauteur=None):
    """Ajoute, recalcule ou retire le bâti (ecart, longueur de point et arrondi en mm). Avec un cadre, on note
    si le bâti en sort (la machine centre le motif dans le cadre : le cadre est centré sur lui)."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    ancien = par_id(r, BATI)
    calque = ancien.getparent() if ancien is not None else None
    if ancien is not None:
        ancien.getparent().remove(ancien)
    if calque is not None and calque.get("id") == BATI + "_calque" and not len(calque):
        calque.getparent().remove(calque)
        calque = None
    if not actif:
        return True
    b = emprise(svg)                               # le motif, sans l'ancien bâti
    if not b:
        return False
    u = 1.0 / mm_par_unite(svg)                    # unités du dessin par mm
    e, a = max(0.0, float(ecart)) * u, max(0.0, float(arrondi)) * u
    x0, y0, x1, y1 = b[0] - e, b[1] - e, b[2] + e, b[3] + e
    depasse = bool(cadre_largeur and cadre_hauteur and
                   (x1 - x0 > float(cadre_largeur) * u or y1 - y0 > float(cadre_hauteur) * u))
    a = min(a, (x1 - x0) / 2, (y1 - y0) / 2)
    if a > 0:
        d = ("M %g,%g H %g A %g,%g 0 0 1 %g,%g V %g A %g,%g 0 0 1 %g,%g H %g A %g,%g 0 0 1 %g,%g V %g "
             "A %g,%g 0 0 1 %g,%g Z" % (x0 + a, y0, x1 - a, a, a, x1, y0 + a, y1 - a, a, a, x1 - a, y1,
                                        x0 + a, a, a, x0, y1 - a, y0 + a, a, a, x0 + a, y0))
    else:
        d = "M %g,%g H %g V %g H %g Z" % (x0, y0, x1, y1, x0)
    if calque is None:                             # son propre calque, tout en haut : brodé en premier
        calque = etree.Element("{%s}g" % SVG_NS)
        calque.set("id", BATI + "_calque")
        calque.set("{%s}groupmode" % INKSCAPE_NS, "layer")
        calque.set("{%s}label" % INKSCAPE_NS, "Bâti")
        premiers = [i for i, c in enumerate(r) if isinstance(c.tag, str) and local(c) not in ("defs", "metadata", "namedview")]
        r.insert(premiers[0] if premiers else len(r), calque)
    el = etree.SubElement(calque, "{%s}path" % SVG_NS)
    el.set("id", BATI)
    el.set("{%s}label" % INKSCAPE_NS, "Bâti")
    el.set("d", d)
    el.set("style", "fill:none;stroke:#e8892e;stroke-width:%g" % (0.3 * u))
    el.set("{%s}stroke_method" % INKSTITCH_NS, "running_stitch")
    el.set("{%s}running_stitch_length_mm" % INKSTITCH_NS, "%g" % float(longueur))
    el.set("{%s}trim_after" % INKSTITCH_NS, "True")
    el.set("{%s}ties" % INKSTITCH_NS, "3")          # sans points d'arrêt : le bâti s'enlève facilement
    el.set("data-broderie-bati", json.dumps({"ecart": float(ecart), "longueur": float(longueur), "arrondi": float(arrondi),
                                             "depasse": depasse}))
    return True


# ---------------------------------------------------------------- figer en points (dentelle FSL, retouches)
# Le trajet réel de l'aiguille, calculé par Ink/Stitch (« Prévisualisation du plan de broderie », mode
# « Plan de broderie »), devient des tracés en point manuel : chaque nœud est une piqûre, modifiable dans
# Inkscape. Un tracé par morceau brodé d'un seul tenant : les sauts restent des sauts.
REGLAGES_FIN = ("trim_after", "stop_after", "force_lock_stitches")


def figer_points(svg, i, plan):
    """Remplace l'objet i par ses points (plan : calque « Stitch Plan » calculé pour lui seul).
    L'original est masqué (œil fermé) ; le groupe de points est placé juste après lui (même ordre de couture).
    Renvoie l'identifiant du groupe, ou None."""
    ix = _inkex()
    el = par_id(svg, i)
    traces = [p for p in plan.iter("{%s}path" % SVG_NS) if p.get("d")]
    if el is None or not traces:
        return None
    t = ix.transforms.Transform()                  # repère du parent de l'objet → repère du dessin
    for a in reversed(list(el.iterancestors())):
        if a.get("transform"):
            t = t @ ix.transforms.Transform(a.get("transform"))
    g = etree.Element("{%s}g" % SVG_NS)
    g.set("id", "points_" + i)
    g.set("{%s}label" % INKSCAPE_NS, "Points de %s" % decrire(el)["nom"])
    if t != ix.transforms.Transform():
        g.set("transform", str(-t))
    for k, p in enumerate(traces):
        q = etree.SubElement(g, "{%s}path" % SVG_NS)
        q.set("id", "points_%s_%d" % (i, k + 1))
        q.set("d", p.get("d"))
        tp = ix.transforms.Transform()             # transformations du plan (groupes et tracé) gardées telles quelles
        for a in list(reversed(list(p.iterancestors()))) + [p]:
            if a.get("transform") and a is not plan.getparent():
                tp = tp @ ix.transforms.Transform(a.get("transform"))
        if tp != ix.transforms.Transform():
            q.set("transform", str(tp))
        q.set("style", "fill:none;stroke:%s;stroke-width:0.4" % couleur(el))     # couleur exacte (bobines)
        q.set("{%s}label" % INKSCAPE_NS, "Points de %s%s" % (decrire(el)["nom"], " (%d)" % (k + 1) if len(traces) > 1 else ""))
        q.set("{%s}stroke_method" % INKSTITCH_NS, "manual_stitch")
    for k in REGLAGES_FIN:                         # coupe, arrêt… de l'original : après le dernier morceau
        v = el.get("{%s}%s" % (INKSTITCH_NS, k))
        if v is not None:
            g[-1].set("{%s}%s" % (INKSTITCH_NS, k), v)
    el.addnext(g)
    montrer(svg, i, False)                         # l'original n'est plus brodé, mais reste là pour revenir en arrière
    return g.get("id")


# ---------------------------------------------------------------- réglages des lettres d'un texte brodé
# Les lettres d'un texte Ink/Stitch sont des formes déjà réglées par la police (satin, point droit, remplissage).
# On règle toutes les formes d'un même type d'un coup, ou celles d'une seule lettre ; les réglages sont gardés
# sur le texte (data-broderie-lettres) et réappliqués quand Ink/Stitch le refabrique (texte, police, taille…).
LETTRES = "data-broderie-lettres"


def _type_forme(el):
    t = types(el)
    for k in ("satin_column", "fill_stitch", "stroke"):
        if k in t:
            return k
    return None


def lettres_du_texte(g):
    """Lettres (glyphes) du texte, dans l'ordre : [(caractère, [formes])]."""
    out = []
    for gl in g.iter("{%s}g" % SVG_NS):
        if gl.get("{%s}letter-group" % INKSTITCH_NS) == "glyph":
            formes = [f for f in gl.iter() if isinstance(f.tag, str) and local(f) in FORMES - {"use"} and _type_forme(f)]
            out.append((gl.get("{%s}label" % INKSCAPE_NS) or "?", formes))
    return out


def reglages_lettres(g):
    try:
        r = json.loads(g.get(LETTRES) or "{}")
    except ValueError:
        r = {}
    r.setdefault("tous", {})
    r.setdefault("lettres", {})
    return r


def resume_lettres(svg, gid):
    """Pour le panneau : les lettres, les types de formes présents et leurs valeurs actuelles, les réglages gardés."""
    g = par_id(svg, gid)
    if g is None:
        return None
    lettres = lettres_du_texte(g)
    par_type = {}
    for _, formes in lettres:
        for f in formes:
            t = _type_forme(f)
            par_type.setdefault(t, {"nombre": 0, "valeurs": {}})
            par_type[t]["nombre"] += 1
            if not par_type[t]["valeurs"]:      # valeurs de la première forme : celles de la police
                par_type[t]["valeurs"] = {etree.QName(k).localname: v for k, v in f.attrib.items()
                                          if k.startswith("{%s}" % INKSTITCH_NS)}
    b = emprise(svg, [gid])
    try:
        lignes = max(1, len(json.loads(g.get("{%s}lettering" % INKSTITCH_NS) or "{}").get("text", "").split("\n")))
    except ValueError:
        lignes = 1
    return {"lettres": [{"car": c, "types": sorted({_type_forme(f) for f in fs})} for c, fs in lettres],
            "types": par_type, "reglages": reglages_lettres(g), "lignes": lignes,
            "hauteur_mm": round((b[3] - b[1]) * mm_par_unite(svg), 1) if b else None}


def _appliquer_lettres(g, reglages):
    lettres = lettres_du_texte(g)
    for k, (_, formes) in enumerate(lettres):
        for f in formes:
            t = _type_forme(f)
            v = dict(reglages["tous"].get(t, {}))
            v.update(reglages["lettres"].get(str(k), {}).get(t, {}))
            if v:
                ecrire(f, v)


def regler_lettres(svg, gid, type_forme, valeurs, lettre=None):
    """Règle les formes d'un type (toutes les lettres, ou la lettre n° lettre) et garde le réglage sur le texte."""
    g = par_id(svg, gid)
    if g is None:
        return False
    r = reglages_lettres(g)
    cible = r["tous"] if lettre is None else r["lettres"].setdefault(str(int(lettre)), {})
    t = cible.setdefault(type_forme, {})
    for k, v in valeurs.items():
        if v is None:
            t.pop(k, None)
        else:
            t[k] = v
    g.set(LETTRES, json.dumps(r, ensure_ascii=False))
    _appliquer_lettres(g, r)
    return True


def reappliquer_lettres(g, reglages):
    """Après qu'Ink/Stitch a refabriqué le texte : on lui redonne les réglages gardés."""
    if reglages and (reglages.get("tous") or reglages.get("lettres")):
        g.set(LETTRES, json.dumps(reglages, ensure_ascii=False))
        _appliquer_lettres(g, reglages)


# ---------------------------------------------------------------- vérifier avant d'exporter
# Problèmes signalés par le dépistage d'Ink/Stitch, traduits, avec ce qu'il faut faire
PROBLEMES = {
    "Simple Satin": ("conseil", "Satin simple (un seul trait épais)",
                     "Il se brode, mais une colonne satin à deux rails donne un plus beau résultat (outil « Trait en satin »)."),
    "Too narrow satin": ("alerte", "Satin trop étroit", "Élargissez-le (au moins 1 mm) ou passez-le en point droit."),
    "Border crosses itself": ("alerte", "Le contour se croise",
                              "Dans Inkscape : Chemin › Union sur cette forme, pour supprimer le croisement."),
    "Small shape": ("alerte", "Forme très petite", "Elle risque de ne pas se broder : agrandissez-la ou masquez-la."),
    "Unconnected": ("erreur", "Forme en plusieurs morceaux", "Dans Inkscape : Chemin › Séparer, puis réglez chaque morceau."),
    "Not stitchable": ("erreur", "Forme impossible à broder", "Vérifiez qu'elle a une surface ou un contour."),
}


def _objet_proche(svg, x, y, boites):
    """Objet (id) dont l'emprise contient le point (le plus petit), sinon le plus proche."""
    dedans = [(b[2] - b[0]) * (b[3] - b[1]) for b in boites.values()]
    meilleur, aire = None, None
    for i, b in boites.items():
        if b[0] - 0.5 <= x <= b[2] + 0.5 and b[1] - 0.5 <= y <= b[3] + 0.5:
            a = (b[2] - b[0]) * (b[3] - b[1])
            if aire is None or a < aire:
                meilleur, aire = i, a
    if meilleur:
        return meilleur
    import math
    return min(boites, key=lambda i: math.dist((x, y), ((boites[i][0] + boites[i][2]) / 2, (boites[i][1] + boites[i][3]) / 2)),
               default=None)


def boites_objets(svg):
    """Emprise de chaque objet brodé et affiché, en unités du dessin."""
    out = {}
    for el in objets(svg):
        b = emprise(svg, [el.get("id")]) if el.get("id") else None
        if b:
            out[el.get("id")] = b
    return out


def problemes_inkstitch(svg, resultat):
    """Calque « Troubleshoot » renvoyé par Ink/Stitch → [(type, x, y)] (point du repère, unités du dessin)."""
    ix = _inkex()
    out = []
    r = resultat.getroot() if hasattr(resultat, "getroot") else resultat
    for g in r.iter("{%s}g" % SVG_NS):
        nom = g.get("{%s}label" % INKSCAPE_NS)
        pointeurs = [p for p in g if isinstance(p.tag, str) and (p.get("id") or "").startswith("inkstitch__invalid_pointer")]
        if not nom or not pointeurs:
            continue
        for p in pointeurs:
            try:
                debut = ix.paths.Path(p.get("d")).end_points
                q = next(iter(debut))
                t = ix.transforms.Transform(p.get("transform") or "")
                for a in p.iterancestors():
                    if a.get("transform"):
                        t = ix.transforms.Transform(a.get("transform")) @ t
                q = t.apply_to_point(q)
                out.append((nom, q.x, q.y))
            except Exception:
                continue
    return out


# ---------------------------------------------------------------- optimiser l'ordre de couture
def ordre_par_couleur(svg):
    """Regroupe les objets de même couleur, calque par calque, en gardant l'ordre d'apparition des couleurs et
    l'ordre des objets d'une même couleur (le fond reste dessous si sa couleur vient en premier). Renvoie True si
    l'ordre a changé. Les calques ne sont pas mélangés : un calque reste un ensemble cousu d'un seul tenant."""
    change = False
    parents = {}
    for el in objets(svg, masques=True):
        parents.setdefault(el.getparent(), []).append(el)
    for parent, els in parents.items():
        if len(els) < 2:
            continue
        couleurs = []
        for el in els:
            c = hex6(couleur(el))
            if c not in couleurs:
                couleurs.append(c)
        nouveau = [el for c in couleurs for el in els if hex6(couleur(el)) == c]
        if nouveau == els:
            continue
        places = sorted(parent.index(el) for el in els)
        for el in els:
            parent.remove(el)
        for pos, el in zip(places, nouveau):
            parent.insert(pos, el)
        change = True
    return change


def resume_couture(points):
    """Nombre de changements de fil, de sauts et de coupes d'une liste de points (export d'Ink/Stitch)."""
    chg = sum(1 for p in points if p[2] == "COLOR_CHANGE")
    coupes = sum(1 for p in points if p[2] == "TRIM")
    sauts, dans = 0, False
    for p in points:
        if p[2] == "JUMP":
            if not dans:
                sauts += 1
            dans = True
        elif p[2] == "STITCH":
            dans = False
    return {"changements": chg, "sauts": sauts, "coupes": coupes}


# ---------------------------------------------------------------- assistant appliqué
def creer_applique(svg, i, largeur=3.0):
    """Appliqué à partir d'une forme fermée : 1 placement (arrêt pour poser le tissu), 2 fixation (arrêt pour
    découper le tissu), 3 bordure satin de largeur mm. La forme d'origine est masquée. Renvoie l'id du groupe."""
    el = par_id(svg, i)
    d = _tracé(el) if el is not None else ""
    if not d:
        return None
    u = 1.0 / mm_par_unite(svg)                              # unités du dessin par mm
    c = hex6(couleur(el)) or "#000000"
    nom = decrire(el)["nom"]
    g = etree.Element("{%s}g" % SVG_NS)
    g.set("id", "applique_" + i)
    g.set("{%s}label" % INKSCAPE_NS, "Appliqué : %s" % nom)
    etapes = [("placement", "1 · Placement (arrêt : posez le tissu)", 0.3, {"stroke_method": "running_stitch",
               "running_stitch_length_mm": "2.5", "stop_after": "True"}),
              ("fixation", "2 · Fixation (arrêt : découpez le tissu)", 0.3, {"stroke_method": "running_stitch",
               "running_stitch_length_mm": "2", "stop_after": "True"}),
              ("bordure", "3 · Bordure satin", float(largeur), {"satin_column": "True", "zigzag_spacing_mm": "0.4",
               "center_walk_underlay": "True"})]
    for cle, libelle, epaisseur, reglages in etapes:
        p = etree.SubElement(g, "{%s}path" % SVG_NS)
        p.set("id", "applique_%s_%s" % (i, cle))
        p.set("{%s}label" % INKSCAPE_NS, libelle)
        p.set("d", d)
        if el.get("transform"):
            p.set("transform", el.get("transform"))
        p.set("style", "fill:none;stroke:%s;stroke-width:%g" % (c, epaisseur * u))
        for k, v in reglages.items():
            p.set("{%s}%s" % (INKSTITCH_NS, k), v)
    el.addnext(g)
    montrer(svg, i, False)
    return g.get("id")


# ---------------------------------------------------------------- position du motif dans le cadre (origine)
# Par défaut, Ink/Stitch exporte le motif centré : la machine le brode au centre du cadre. Avec la commande
# « Origine » d'Ink/Stitch posée au centre de la feuille (qui a la taille du cadre), le motif est brodé à sa
# place sur la feuille, décalé dans le cadre s'il l'est dans Inkscape.
ORIGINE = "inkstitch_origin"
XLINK = "http://www.w3.org/1999/xlink"


def _usages_origine(svg):
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    return [u for u in r.iter("{%s}use" % SVG_NS)
            if (u.get("{%s}href" % XLINK) or u.get("href") or "").lstrip("#") == ORIGINE]


def origine_active(svg):
    return bool(_usages_origine(svg))


def symbole_origine(svg):
    """Le symbole d'origine d'Ink/Stitch (dans les définitions du dessin), en texte, ou None."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    s = r.xpath("//*[@id='%s']" % ORIGINE)
    return etree.tostring(s[0], encoding="unicode") if s else None


def placer_origine(svg, actif, symbole=None):
    """Pose (actif) ou retire l'origine, au centre de la feuille. symbole : le symbole d'Ink/Stitch, ajouté aux
    définitions s'il manque (dessin d'Inkscape au moment de la synchronisation)."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    for u in _usages_origine(r):
        u.getparent().remove(u)
    if not actif:
        return True
    if not r.xpath("//*[@id='%s']" % ORIGINE):
        if not symbole:
            return False
        defs = r.find("{%s}defs" % SVG_NS)
        if defs is None:
            defs = etree.Element("{%s}defs" % SVG_NS)
            r.insert(0, defs)
        defs.append(etree.fromstring(symbole))
    vb = [float(x) for x in (r.get("viewBox") or "0 0 0 0").replace(",", " ").split()]
    if len(vb) != 4 or not vb[2]:
        return False
    u = etree.SubElement(r, "{%s}use" % SVG_NS)
    u.set("id", "broderie_origine")
    u.set("{%s}label" % INKSCAPE_NS, "Ink/Stitch Command: Origin for exported embroidery files")
    u.set("{%s}href" % XLINK, "#" + ORIGINE)
    u.set("x", "%g" % (vb[0] + vb[2] / 2))
    u.set("y", "%g" % (vb[1] + vb[3] / 2))
    return True
