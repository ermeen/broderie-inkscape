"""Broderie pour Inkscape : modèle (sans interface).

Lit et écrit les réglages Ink/Stitch d'un document SVG, exactement comme Ink/Stitch les
stocke : attributs `inkstitch:<nom>` (espace de noms http://inkstitch.org/namespace).
Aucun algorithme de broderie ici : la génération des points est confiée au moteur
Ink/Stitch installé (voir moteur.py).
"""
import gettext
import json
import os
import re

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


def fond_transparent(el):
    """Fond rempli mais d'opacité 0 (curseur alpha à zéro dans Inkscape) : Ink/Stitch ne le brode pas."""
    f = _style_herite(el, "fill")
    if not f or f.lower() == "none":
        return False
    try:
        return float(_style_herite(el, "fill-opacity") or 1) == 0
    except ValueError:
        return False


def rendre_opaque(el):
    """Fond visible (opacité 1) : Ink/Stitch le brodera."""
    st = _style(el)
    st["fill-opacity"] = "1"
    el.set("style", ";".join(f"{k}:{v}" for k, v in st.items()))


def _cache(el, masques=False):
    """Hors broderie : définitions, aperçu, connecteurs… et objets masqués (sauf si masques=True)."""
    while el is not None and isinstance(el.tag, str):
        if el.get("id") == PLAN or local(el) in ("defs", "metadata", "symbol", "clipPath", "mask", "marker"):
            return True
        if (not masques and _style(el).get("display") == "none") or el.get(f"{{{INKSTITCH_NS}}}connector-type") \
                or el.get(f"{{{INKSCAPE_NS}}}connector-type"):        # connecteur d'une commande d'Ink/Stitch
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
    if est_guide(el):
        return ["guide"]                               # ligne guide d'un remplissage guidé : pas brodée
    out = []
    fill = _style_herite(el, "fill")
    stroke = _style_herite(el, "stroke")
    contour = bool(stroke and stroke.lower() != "none")
    # fond transparent (opacité 0) : Ink/Stitch l'ignore ; un objet qui a un contour est alors un simple trait.
    # Sans contour, on le garde comme remplissage, pour pouvoir signaler qu'il ne sera pas brodé.
    if nom not in ("line", "polyline") and (fill is None or fill.lower() != "none") and booleen(attr(el, "fill"), True) \
            and not (contour and fond_transparent(el)):
        out.append("fill_stitch")
    if contour:
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
        if nom == "use" and (el.get("{%s}href" % XLINK_NS) or el.get("href") or "").startswith("#inkstitch_"):
            continue                                   # symbole d'une commande d'Ink/Stitch (départ, origine…)
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
        "auto": _auto(el) or [],
        "transparent": "fill_stitch" in t and fond_transparent(el),
        "guide": guide_de(el.getroottree(), el.get("id")) if "fill_stitch" in t else None,
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
    """Écrit les réglages : None ou "" supprime l'attribut (valeur par défaut d'Ink/Stitch).
    Un réglage écrit à la main n'est plus « auto » ; un réglage calculable remis à la valeur d'Ink/Stitch est noté
    comme tel, pour ne pas repasser en auto tout seul."""
    marquer_auto(el, [n for n in (_auto(el) or []) if n not in valeurs])
    calculables = set(sum((list(PARAMS_AUTO.get(t, ())) for t in types(el)), []))
    choix = set(_liste(el, INKSTITCH_CHOISI))
    for nom, v in valeurs.items():
        if (v is None or v == "") and nom in calculables:
            choix.add(nom)
        else:
            choix.discard(nom)
    _marquer(el, INKSTITCH_CHOISI, choix)
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
    avant = _repere(el)                                # place à l'écran, à garder dans le nouveau calque
    ancien = el.getparent()
    el.getparent().remove(el)
    if est_calque(ci) and not est_calque(el):
        ci.insert(0, el)
    elif apres:
        ci.addnext(el)
    else:
        ci.addprevious(el)
    if el.getparent() is not ancien:                   # calque d'arrivée décalé ou tourné autrement : on compense
        el.attrib.pop("transform", None)
        t = (-_repere(el)) @ avant
        if t != _inkex().transforms.Transform():
            el.set("transform", str(t))
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
    el.set("style", "fill:none;stroke:%s;stroke-width:%g" % (_couleur_premier(svg), 0.3 * u))
    el.set("{%s}stroke_method" % INKSTITCH_NS, "running_stitch")
    el.set("{%s}running_stitch_length_mm" % INKSTITCH_NS, "%g" % float(longueur))
    el.set("{%s}trim_after" % INKSTITCH_NS, "True")
    el.set("{%s}ties" % INKSTITCH_NS, "3")          # sans points d'arrêt : le bâti s'enlève facilement
    el.set("data-broderie-bati", json.dumps({"ecart": float(ecart), "longueur": float(longueur), "arrondi": float(arrondi),
                                             "depasse": depasse}))
    return True


def recolorer_bati(svg):
    """Redonne au bâti la couleur du premier objet brodé ; True s'il a changé."""
    el = par_id(svg.getroot() if hasattr(svg, "getroot") else svg, BATI)
    if el is None:
        return False
    c = _couleur_premier(svg)
    if (_style(el).get("stroke") or "").lower() == c.lower():
        return False
    changer_couleur(el, "stroke", c)
    return True


def _couleur_premier(svg):
    """Couleur du premier objet brodé (texte : sa première lettre) : le bâti se brode avec ce fil,
    sans changement de fil avant le motif. Orange si le dessin n'en a pas."""
    for el in objets(svg):
        if el.get("id") == BATI:
            continue
        if local(el) == "g":                       # lettrage : la première lettre visible
            el = next((x for x in el.iter() if isinstance(x.tag, str) and local(x) in FORMES and types(x)), None)
            if el is None:
                continue
        return couleur(el)
    return "#e8892e"


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
    "Rung doesn't intersect rails": ("alerte", "Traverse qui ne coupe pas les rails",
                                     "Chaque traverse doit couper les deux rails : prolongez-la dans Inkscape, sinon le sens des points est faux."),
    "Fill and Stroke color": ("conseil", "Fond et contour",
                              "Cet objet a un fond et un contour : les deux seront brodés. Retirez l'un des deux dans Inkscape s'il ne doit pas l'être."),
    "Image": ("conseil", "Image dans le dessin", "Une image n'est jamais brodée : elle sert seulement de modèle (vous pouvez la masquer)."),
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


# ---------------------------------------------------------------- départ et fin d'un remplissage
# Commandes d'Ink/Stitch attachées à un objet : un groupe « Ink/Stitch Command » placé juste après l'objet, avec
# un symbole (use) et un connecteur qui le relie à l'objet. Ink/Stitch prend la position du symbole, ramenée
# sur le bord de la forme : déplacer le symbole, c'est choisir où l'aiguille commence ou finit.
POSITIONS = ("starting_point", "ending_point")
_CON_DEBUT, _CON_FIN = "{%s}connection-start" % INKSCAPE_NS, "{%s}connection-end" % INKSCAPE_NS


def _commande_placee(racine, i, quoi):
    """(connecteur, symbole) de la commande quoi attachée à l'objet i, ou None."""
    for c in racine.iter("{%s}path" % SVG_NS):
        if c.get(_CON_FIN) != "#" + i:
            continue
        u = par_id(racine, (c.get(_CON_DEBUT) or "").lstrip("#"))
        if u is not None and (u.get("{%s}href" % XLINK_NS) or u.get("href") or "") == "#inkstitch_" + quoi:
            return c, u
    return None


def _repere(el):
    """Transformation du repère de el (ses groupes et calques) vers celui du dessin."""
    ix = _inkex()
    t = ix.transforms.Transform()
    for a in reversed(list(el.iterancestors())):
        if a.get("transform"):
            t = t @ ix.transforms.Transform(a.get("transform"))
    return t @ ix.transforms.Transform(el.get("transform") or "")


def commandes_placees(svg):
    """{id d'objet : {quoi : [x, y]}} : départs et fins posés, dans le repère du dessin."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    out = {}
    for c in r.iter("{%s}path" % SVG_NS):
        fin, debut = c.get(_CON_FIN), c.get(_CON_DEBUT)
        if not (fin and debut):
            continue
        u = par_id(r, debut.lstrip("#"))
        h = (u.get("{%s}href" % XLINK_NS) or u.get("href") or "") if u is not None else ""
        quoi = h[len("#inkstitch_"):] if h.startswith("#inkstitch_") else None
        if quoi in POSITIONS:
            x, y = _repere(u).apply_to_point((float(u.get("x") or 0), float(u.get("y") or 0)))
            out.setdefault(fin.lstrip("#"), {})[quoi] = [round(x, 3), round(y, 3)]
    return out


def retirer_commande(svg, i, quoi):
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    t = _commande_placee(r, i, quoi)
    if t is None:
        return False
    c, u = t
    g = c.getparent()
    if local(g) == "g" and (g.get("{%s}label" % INKSCAPE_NS) or "").startswith("Ink/Stitch Command"):
        g.getparent().remove(g)
    else:
        for x in (c, u):
            if x.getparent() is not None:
                x.getparent().remove(x)
    return True


def deplacer_commande(svg, i, quoi, x, y):
    """Place le symbole (et l'extrémité du connecteur) au point (x, y) du dessin."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    t = _commande_placee(r, i, quoi)
    if t is None:
        return False
    c, u = t
    lx, ly = (-_repere(u)).apply_to_point((float(x), float(y)))
    u.set("x", "%g" % lx)
    u.set("y", "%g" % ly)
    cx, cy = (-_repere(c)).apply_to_point((float(x), float(y)))
    ix = _inkex()
    try:                                               # le connecteur part du symbole ; Inkscape le redessine
        p = ix.paths.Path(c.get("d") or "").to_absolute()
        fin = list(p.end_points)[-1]
        c.set("d", "M %g,%g L %g,%g" % (cx, cy, fin.x, fin.y))
    except Exception:
        pass
    return True


def groupe_commande(svg, i, quoi):
    """Le groupe de la commande (texte) et les symboles qu'il utilise, pour le rejouer dans Inkscape."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    t = _commande_placee(r, i, quoi)
    if t is None:
        return None, None
    g = t[0].getparent()
    s = r.xpath("//*[@id='inkstitch_%s']" % quoi)
    return etree.tostring(g, encoding="unicode"), (etree.tostring(s[0], encoding="unicode") if s else None)


def poser_commande(svg, i, quoi, groupe, symbole):
    """Remplace la commande quoi de l'objet i par groupe (texte), juste après l'objet ; ajoute le symbole."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    el = par_id(r, i)
    if el is None:
        return False
    retirer_commande(r, i, quoi)
    if symbole and not r.xpath("//*[@id='inkstitch_%s']" % quoi):
        defs = r.find("{%s}defs" % SVG_NS)
        if defs is None:
            defs = etree.SubElement(r, "{%s}defs" % SVG_NS)
            r.insert(0, defs)
        defs.append(etree.fromstring(symbole))
    g = etree.fromstring(groupe)
    el.addnext(g)
    return True


# ---------------------------------------------------------------- largeur d'une colonne satin
def _echantillons(sp, n=8):
    """Points d'un sous-chemin (CubicSuperPath) : n points par segment de Bézier."""
    out = []
    for a, b in zip(sp, sp[1:]):
        p0, p1, p2, p3 = a[1], a[2], b[0], b[1]
        for k in range(n):
            t = k / n
            u = 1 - t
            out.append(tuple(u ** 3 * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t ** 3 * p3[i] for i in (0, 1)))
    if sp:
        out.append(tuple(sp[-1][1]))
    return out


def largeur_satin(svg, el):
    """Largeur maximale (mm) d'une colonne satin : l'écart entre ses deux rails (les deux plus longs sous-chemins),
    ou l'épaisseur du trait pour un satin fait d'un seul tracé. None si on ne sait pas la mesurer."""
    import math
    ix = _inkex()
    t = _repere(el)
    mm = mm_par_unite(svg)
    try:
        csp = ix.paths.Path(_tracé(el)).transform(t).to_superpath()
    except Exception:
        return None
    subs = [_echantillons(sp) for sp in csp if len(sp) > 1]
    longueur = lambda pts: sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))
    if len(subs) < 2:                                   # un seul tracé : la largeur est l'épaisseur du trait
        try:
            ep = float(re.sub(r"[^\d.]", "", _style_herite(el, "stroke-width") or "") or 0)
        except ValueError:
            return None
        return ep * math.sqrt(abs(t.a * t.d - t.b * t.c)) * mm if ep else None
    rails = sorted(subs, key=longueur, reverse=True)[:2]
    a, b = rails
    return max(min(math.dist(p, q) for q in b) for p in a) * mm


# ---------------------------------------------------------------- broder avant / après un autre calque
# Ink/Stitch brode dans l'ordre du dessin. Pour broder quelques objets d'un calque avant un autre calque (objets
# glissés entre deux calques dans la liste)
# sans mélanger les calques, on les met dans un calque « <nom> · après <calque> » placé juste après (ou avant) ce calque.
# Leur position à l'écran ne change pas (transformations recalculées), leurs repères de départ et de fin suivent.
def _calques(r):
    return [g for g in r.iter("{%s}g" % SVG_NS) if g.get("{%s}groupmode" % INKSCAPE_NS) == "layer"]


def broder_ailleurs(svg, ids, cible, apres=True, nouveau=None):
    """Déplace les objets ids dans un calque « suite » de leur calque, placé après (ou avant) le calque cible.
    nouveau : identifiant à donner au calque créé (pour rejouer la même opération dans Inkscape).
    Renvoie l'identifiant du calque qui les reçoit, ou None."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    c = par_id(r, cible)
    els = [e for e in (par_id(r, i) for i in ids) if e is not None]
    if c is None or not els:
        return None
    ix = _inkex()
    origine = calque(els[0])
    base = (origine[1] if origine[0] else "Objets").split(" · ")[0]          # « Citrouille · avant … » → Citrouille
    nom = "%s · %s %s" % (base, "après" if apres else "avant", c.get("{%s}label" % INKSCAPE_NS) or cible)
    # calque « suite » déjà juste à côté du calque cible (même nom) : on le réutilise
    voisin = c.getnext() if apres else c.getprevious()
    if voisin is not None and voisin.get("{%s}groupmode" % INKSCAPE_NS) == "layer" \
            and (voisin.get("{%s}label" % INKSCAPE_NS) or "") == nom:
        suite = voisin
    else:
        suite = etree.Element("{%s}g" % SVG_NS)
        suite.set("{%s}groupmode" % INKSCAPE_NS, "layer")
        suite.set("{%s}label" % INKSCAPE_NS, nom)
        pris = {e.get("id") for e in r.iter() if isinstance(e.tag, str)}
        i, n = nouveau or "calque_suite", 1
        while i in pris:
            n += 1
            i = "%s%d" % (nouveau or "calque_suite", n)
        suite.set("id", i)
        (c.addnext if apres else c.addprevious)(suite)
    hors = -_repere(suite)                              # repère du dessin → repère du calque « suite »
    anciens = set()
    for el in els:
        attaches = [c2.getparent() for c2 in r.iter("{%s}path" % SVG_NS)    # repères départ / fin de l'objet
                    if c2.get(_CON_FIN) == "#" + el.get("id") and (c2.getparent().get("{%s}label" % INKSCAPE_NS) or "").startswith("Ink/Stitch Command")]
        for x in [el] + attaches:
            t = hors @ _repere(x)                      # même place à l'écran une fois dans le nouveau calque
            anciens.add(x.getparent())
            x.getparent().remove(x)
            if t == ix.transforms.Transform():
                x.attrib.pop("transform", None)
            else:
                x.set("transform", str(t))
            suite.append(x)
    for g in anciens:                                  # un calque « · » créé ici et devenu vide disparaît
        if g is not suite and (g.get("id") or "").startswith("calque_suite") and not any(isinstance(e.tag, str) for e in g):
            g.getparent().remove(g)
    return suite.get("id")


# ---------------------------------------------------------------- profil de broderie et réglages automatiques
# Trois façons pour un réglage : valeur d'Ink/Stitch (rien d'écrit), « auto » (calculée d'après le profil du dessin
# — tissu, stabilisateur, fil — et la forme), ou à la main. Les réglages auto sont écrits comme les autres (le fichier
# reste un fichier Ink/Stitch ordinaire) et notés dans data-broderie-auto pour être recalculés si le profil change.
#
# Sources des règles (aucune table officielle chiffrée n'existe : Wilcom, Hatch et Ink/Stitch demandent un essai) :
# - sous-couches satin selon la largeur : Ink/Stitch, tutoriel « underlay » (centre 1 à 2 mm, contour 2 à 3,5 mm,
#   contour + zigzag au-delà de 4 mm) ; mailles et polaire : sous-couches renforcées (Wilcom, « About auto fabrics ») ;
# - compensation selon la largeur : environ 0,15 mm pour une colonne de 2 mm, 0,25 à 0,3 mm de 5 à 7 mm (guides de
#   numérisation) ; mailles : davantage, tissés stables et soie : moins (Wilcom, « About auto fabrics ») ;
# - densité satin selon le fil : 0,4 mm en fil 40 (0,42 chez Wilcom et Hatch), plus serré en fil 60 (≈ 0,35),
#   plus large en fil 30 (≈ 0,45) ; tissus épais, polaire, mailles : un peu moins dense (Wilcom) ;
# - remplissage : 0,4 mm en fil 40, valeur sûre (guides Hatch) ; soie : sous-couche minimale (Wilcom) ;
# - stabilisateur : à découper pour les mailles, à déchirer pour les tissés, film soluble dessus pour les tissus à
#   poils (Hatch « Choose auto fabrics », Threads Magazine) ; plus faible que conseillé : le tissu bouge davantage.
AUTO = "data-broderie-auto"
INKSTITCH_CHOISI = "data-broderie-inkstitch"          # réglages remis exprès à la valeur d'Ink/Stitch
PROFIL = "data-broderie-profil"
PROFIL_DEFAUT = {"tissu": "coton", "stabilisateur": "dechirer", "fil": "40"}
STABILITE = {"decouper": 3, "dechirer": 2, "soluble": 1, "aucun": 0}   # du plus stable au moins stable
# comp : multiplicateur de la compensation (coton = 1) ; dens : multiplicateur de l'écart entre points (1 = normal) ;
# renfort : sous-couche contour + zigzag dès 2 mm ; stab : stabilisateur conseillé ; dessus : film soluble dessus
TISSUS = {
    "toile":  {"nom": "Toile, jean, tissu épais", "comp": 0.7, "dens": 1.1, "renfort": False, "stab": "dechirer", "dessus": False},
    "coton":  {"nom": "Coton, lin", "comp": 1.0, "dens": 1.0, "renfort": False, "stab": "dechirer", "dessus": False},
    "fin":    {"nom": "Tissu fin, soie, voile", "comp": 0.6, "dens": 1.1, "renfort": False, "stab": "soluble", "dessus": False},
    "pique":  {"nom": "Piqué (polo)", "comp": 1.3, "dens": 1.05, "renfort": True, "stab": "decouper", "dessus": True},
    "jersey": {"nom": "Jersey, tee-shirt, maille", "comp": 1.6, "dens": 1.05, "renfort": True, "stab": "decouper", "dessus": False},
    "eponge": {"nom": "Éponge, polaire, sweat", "comp": 1.4, "dens": 1.1, "renfort": True, "stab": "decouper", "dessus": True},
    "cuir":   {"nom": "Cuir, simili", "comp": 0.6, "dens": 1.1, "renfort": False, "stab": "dechirer", "dessus": False},
}
STABILISATEURS = {"decouper": {"nom": "À découper (ou thermocollant)"}, "dechirer": {"nom": "À déchirer"},
                  "soluble": {"nom": "Soluble à l'eau"}, "aucun": {"nom": "Aucun"}}
FILS = {"30": {"nom": "Fil 30 (épais)", "satin": 0.45, "remp": 0.45}, "40": {"nom": "Fil 40 (courant)", "satin": 0.40, "remp": 0.40},
        "60": {"nom": "Fil 60 (fin)", "satin": 0.35, "remp": 0.35}}
PARAMS_AUTO = {"satin_column": ("zigzag_spacing_mm", "pull_compensation_mm", "max_stitch_length_mm",
                                "center_walk_underlay", "contour_underlay", "zigzag_underlay"),
               "fill_stitch": ("row_spacing_mm", "pull_compensation_mm", "fill_underlay")}


def conseil_profil(p):
    """Phrase de conseil pour le profil : stabilisateur conseillé, film soluble dessus."""
    p = dict(PROFIL_DEFAUT, **(p or {}))
    t = TISSUS.get(p["tissu"], TISSUS["coton"])
    out = []
    if STABILITE.get(p["stabilisateur"], 2) < STABILITE[t["stab"]]:
        out.append("stabilisateur conseillé pour ce tissu : %s (la compensation est augmentée de 20 %% en attendant)"
                   % STABILISATEURS[t["stab"]]["nom"].lower())
    if t["dessus"]:
        out.append("posez un film soluble sur le tissu, pour que les points ne s'enfoncent pas")
    return out


def _liste(el, attribut):
    v = el.get(attribut)
    return v.split() if v else []


def _marquer(el, attribut, noms):
    if noms:
        el.set(attribut, " ".join(sorted(set(noms))))
    else:
        el.attrib.pop(attribut, None)


def _auto(el):
    return _liste(el, AUTO) or None


def marquer_auto(el, noms):
    _marquer(el, AUTO, noms)


def profil(svg):
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    try:
        p = json.loads(r.get(PROFIL) or "null")
    except ValueError:
        p = None
    return p


def regler_profil(svg, p):
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    p = {k: p.get(k) for k in PROFIL_DEFAUT if p and p.get(k)}
    r.set(PROFIL, json.dumps(p, ensure_ascii=False))
    return p


def _arrondi(v, pas=0.05):
    return round(round(v / pas) * pas, 2)


def valeurs_auto(svg, el, p=None):
    """Valeurs calculées pour l'objet, d'après le profil du dessin et sa forme (règles et sources ci-dessus)."""
    p = dict(PROFIL_DEFAUT, **(p or profil(svg) or {}))
    t, fil = TISSUS.get(p["tissu"], TISSUS["coton"]), FILS.get(p["fil"], FILS["40"])
    faible = 1.2 if STABILITE.get(p["stabilisateur"], 2) < STABILITE[t["stab"]] else 1.0
    ty = types(el)
    if "satin_column" in ty:
        larg = largeur_satin(svg, el) or 3.0
        base = min(0.35, 0.15 + 0.03 * max(0.0, larg - 2.0))            # 0,15 à 2 mm … 0,30 à 7 mm
        contour = larg >= 2.0
        zigzag = larg > 4.0 or (contour and t["renfort"])
        return {"zigzag_spacing_mm": _arrondi(fil["satin"] * t["dens"], 0.01),
                "pull_compensation_mm": _arrondi(base * t["comp"] * faible, 0.01),
                "max_stitch_length_mm": 7 if larg > 8 else None,
                "center_walk_underlay": not contour, "contour_underlay": contour, "zigzag_underlay": zigzag}
    if "fill_stitch" in ty:
        return {"row_spacing_mm": _arrondi(fil["remp"] * t["dens"], 0.01),
                "pull_compensation_mm": _arrondi(0.2 * t["comp"] * faible, 0.01),
                "fill_underlay": p["tissu"] != "fin"}
    return {}


def appliquer_auto(svg, el, noms=None):
    """Passe les réglages noms (tous ceux qui ont un calcul par défaut) en « auto » ; renvoie les valeurs écrites."""
    calc = valeurs_auto(svg, el)
    noms = [n for n in (noms or calc) if n in calc]
    if not noms:
        return {}
    deja = set(_auto(el) or [])
    vals = {n: calc[n] for n in noms}
    ecrire(el, vals)
    marquer_auto(el, deja | set(noms))
    _marquer(el, INKSTITCH_CHOISI, set(_liste(el, INKSTITCH_CHOISI)) - set(noms))   # « aucune découpe » calculée n'est pas un choix
    return vals


def auto_par_defaut(svg):
    """Met en auto les réglages calculables que personne n'a touchés (ni valeur écrite, ni choix « Ink/Stitch »).
    Les valeurs réglées à la main ne bougent pas. Sans profil, celui par défaut est enregistré. Renvoie le nombre
    d'objets réglés."""
    n = 0
    for el in objets(svg, masques=True):
        t = types(el)
        typ = "satin_column" if "satin_column" in t else "fill_stitch" if "fill_stitch" in t else None
        if typ is None:
            continue
        pris = set(_auto(el) or []) | set(_liste(el, INKSTITCH_CHOISI))
        noms = [x for x in PARAMS_AUTO[typ] if attr(el, x) is None and x not in pris]
        if noms:
            if not profil(svg):
                regler_profil(svg, PROFIL_DEFAUT)
            if appliquer_auto(svg, el, noms):
                n += 1
    return n


def recalculer_auto(svg):
    """Après un changement de profil : recalcule tous les réglages auto du dessin. Renvoie {id: valeurs}."""
    out = {}
    for el in objets(svg, masques=True):
        a = _auto(el)
        if a:
            v = appliquer_auto(svg, el, a)
            if v:
                out[el.get("id")] = v
    return out


# ---------------------------------------------------------------- remplissage guidé : la ligne guide
# Ink/Stitch oriente les rangs d'un remplissage « guidé » le long d'une ligne guide : un tracé marqué d'un repère
# (marker-start inkstitch-guide-line-marker), placé dans le même groupe ou calque que la forme. Vérifié : même calque
# = même résultat que groupés ; sans ligne guide, le remplissage guidé redevient un tatami.
GUIDE = "inkstitch-guide-line-marker"


def est_guide(el):
    return GUIDE in (_style(el).get("marker-start") or "")


def guide_de(svg, i):
    """Identifiant de la ligne guide qui oriente le remplissage i (même groupe ou calque), ou None."""
    el = par_id(svg.getroot() if hasattr(svg, "getroot") else svg, i)
    if el is None or el.getparent() is None:
        return None
    g = next((x for x in el.getparent() if isinstance(x.tag, str) and est_guide(x)), None)
    return g.get("id") if g is not None else None


def marqueurs_guide(svg):
    """Définitions du repère de ligne guide (texte), pour les recopier dans un autre dessin."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    return [etree.tostring(x, encoding="unicode") for x in r.iter() if isinstance(x.tag, str)
            and (x.get("id") or "").startswith("inkstitch-guide-line") and local(x.getparent()) == "defs"]


def lier_guide(svg, i, g, style, marqueurs, groupe=None):
    """Fait du tracé g la ligne guide du remplissage i : son style devient celui d'une ligne guide (avec le repère
    d'Ink/Stitch), les autres lignes guides voisines redeviennent des traits, et si g n'est pas dans le même groupe
    ou calque que i, les deux sont réunis dans un groupe (position à l'écran inchangée). Renvoie le groupe, ou None."""
    r = svg.getroot() if hasattr(svg, "getroot") else svg
    f, gl = par_id(r, i), par_id(r, g)
    if f is None or gl is None:
        return None
    defs = r.find("{%s}defs" % SVG_NS)
    if defs is None:
        defs = etree.Element("{%s}defs" % SVG_NS)
        r.insert(0, defs)
    for m in marqueurs or []:
        x = etree.fromstring(m)
        if not r.xpath("//*[@id='%s']" % x.get("id")):
            defs.append(x)
    parent = f.getparent()
    if gl.getparent() is not parent:                   # pas au même endroit : un groupe pour les deux
        grp = etree.Element("{%s}g" % SVG_NS)
        grp.set("id", groupe or "guide_" + i)
        grp.set("{%s}label" % INKSCAPE_NS, "Remplissage guidé")
        f.addprevious(grp)
        hors = -_repere(grp)
        for x in (f, gl):
            t = hors @ _repere(x)
            x.getparent().remove(x)
            x.attrib.pop("transform", None)
            if t != _inkex().transforms.Transform():
                x.set("transform", str(t))
            grp.append(x)
        parent = grp
    for x in parent:                                   # une seule ligne guide par groupe
        if isinstance(x.tag, str) and x is not gl and est_guide(x):
            st = _style(x)
            st.pop("marker-start", None)
            x.set("style", ";".join(f"{k}:{v}" for k, v in st.items()))
    gl.set("style", style)
    ecrire(f, {"fill_method": "guided_fill"})
    if _auto(f):
        appliquer_auto(svg, f, _auto(f))               # réglages auto recalculés pour un remplissage guidé
    return parent.get("id")
