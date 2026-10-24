"""Contrôle automatique : chaque réglage Ink/Stitch du panneau change-t-il les points calculés ?"""
import json
import sys
import time

sys.path.insert(0, sys.argv[1])            # dossier Broderie-Inkscape
from lxml import etree                      # noqa: E402
from broderie import modele as M, moteur as E   # noqa: E402

SORTIE = sys.argv[2]
NS = 'xmlns="http://www.w3.org/2000/svg" xmlns:inkstitch="http://inkstitch.org/namespace" xmlns:xlink="http://www.w3.org/1999/xlink"'
FORMES = {
    # objet testé (id="t") + petit objet après (pour les coupes, arrêts, points d'arrêt entre objets)
    "fill_stitch": '<path id="t" d="M 10,10 L 50,10 L 50,40 L 10,40 Z M 22,20 L 38,20 L 38,30 L 22,30 Z" style="fill:#c0392b;fill-rule:evenodd;stroke:none" {a}/>',
    "satin_column": '<path id="t" d="M 10,20 C 40,12 70,12 100,24 M 10,30 C 40,24 70,24 100,36 M 30,14 L 30,30 M 70,13 L 70,29" '
                    'style="fill:none;stroke:#2c3e50;stroke-width:0.5" inkstitch:satin_column="True" {a}/>',
    "stroke": '<path id="t" d="M 10,20 C 30,5 50,35 70,20 S 100,10 110,25" style="fill:none;stroke:#27ae60;stroke-width:0.3" {a}/>',
    "clone": '<defs><path id="src" d="M 10,10 L 40,10 L 40,30 L 10,30 Z" style="fill:#8e44ad;stroke:none"/></defs>'
             '<use id="t" xlink:href="#src" x="5" y="5" {a}/>',
}
FORMES["element"] = FORMES["fill_stitch"]
APRES = '<rect id="apres" x="70" y="50" width="12" height="8" style="fill:#c0392b;stroke:none"/>'
PARTICULIERS = {   # valeur de test choisie à la main quand la règle générale ne convient pas
    "bean_stitch_repeats": "2", "running_stitch_length_mm": "1.2", "zigzag_spacing_mm": "1.2",
    "random_seed": "12345", "lock_custom_start": "M 0,0 L 1,1 L 0,2", "lock_custom_end": "M 0,0 L 1,1 L 0,2",
    "repeats": "3", "angle": "45", "tartan_angle": "10", "guided_fill_angle": "30", "fill_underlay_angle": "30",
    "meander_angle": "30", "zigzag_angle": "30", "cross_rotation": "20", "pattern_size_mm": "5", "cross_offset_mm": "1.3",
    "expand_mm": "1.5", "short_stitch_inset": "40", "min_stitch_length_mm": "2.5", "min_jump_stitch_length_mm": "30",
    "smoothness_mm": "1.5", "running_stitch_position": "20", "center_walk_underlay_position": "20",
    "scale_end": "50", "scale_start": "50", "grid_size_mm": "2", "line_count": "4", "min_line_dist_mm": "2",
    "split_staggers": "2", "staggers": "2", "skip_start": "1", "skip_end": "1", "exponent": "2",
    "max_stitch_length_mm": "1.5", "random_split_jitter_percent": "30", "min_random_split_length_mm": "0.5",
    "gap_fill_rows": "2", "rows_per_thread": "4", "herringbone_width_mm": "3", "fill_coverage": "80",
    "cross_thread_count": "2", "zigzag_width_mm": "1", "contour_underlay_inset_percent": "20", "zigzag_underlay_inset_percent": "20",
}


def valeur_test(p, defaut):
    n = p["name"]
    if n in PARTICULIERS:
        return PARTICULIERS[n]
    t = p.get("type")
    if t in ("boolean", "toggle"):
        return "False" if M.booleen(defaut, t == "toggle") else "True"
    if t == "dropdown" and isinstance(p.get("options"), list):
        d = int(defaut or 0)
        return str(1 if d == 0 and len(p["options"]) > 1 else 0)
    if t == "combo" and isinstance(p.get("options"), list):
        autres = [o for o in p["options"] if o != defaut]
        return autres[min(1, len(autres) - 1)] if autres else None
    try:
        d = float(defaut)
    except (TypeError, ValueError):
        d = None
    if "percent" in n:
        return "35" if not d else str(d * 0.5)
    if d:
        return str(round(d * 2, 3))
    return "0.8"


def document(typ, attrs):
    a = " ".join('inkstitch:%s="%s"' % (k, str(v).replace('"', "&quot;")) for k, v in attrs.items())
    svg = ('<svg %s width="130mm" height="70mm" viewBox="0 0 130 70"><metadata><inkstitch:inkstitch_svg_version>4'
           '</inkstitch:inkstitch_svg_version></metadata>%s%s</svg>' % (NS, FORMES[typ].format(a=a), APRES))
    return etree.ElementTree(etree.fromstring(svg))


cache = {}


def points(typ, attrs):
    cle = (typ, tuple(sorted(attrs.items())))
    if cle not in cache:
        r, err = E.points(document(typ, attrs))
        cache[cle] = (r["points"] if r else None, (err or "").strip().splitlines()[-1:] if not r else [])
    return cache[cle]


schema = M.schema()
resultats = []
t0 = time.time()
for typ, sc in schema.items():
    params = {p["name"]: p for p in sc["params"]}
    for p in sc["params"]:
        n = p["name"]
        if n == "satin_column" and typ != "clone":
            continue
        contexte = {}
        if p.get("select_items"):
            k, v = p["select_items"][0]
            contexte[k] = v
        if p.get("groupe"):                     # réglage de sous-couche : on active la sous-couche
            for q in sc["params"]:
                if q.get("groupe") == p["groupe"] and q.get("type") == "toggle" and q["name"] != n:
                    contexte[q["name"]] = "True"
        if n == "lock_custom_start":
            contexte["ties"] = "0"
        defaut = p.get("default")
        if p.get("type") == "combo" and isinstance(p.get("options"), list) and isinstance(defaut, int):
            defaut = p["options"][defaut]
        v = valeur_test(p, defaut)
        if v is None:
            resultats.append({"type": typ, "nom": n, "libelle": p.get("libelle"), "etat": "non testable", "detail": "pas d'autre valeur"})
            continue
        base, e1 = points(typ, contexte)
        modif, e2 = points(typ, dict(contexte, **{n: v}))
        if base is None or modif is None:
            etat, detail = "erreur", " ".join(e1 + e2)[:160]
        elif base != modif:
            nb = sum(1 for x in base if x[2] == "STITCH"), sum(1 for x in modif if x[2] == "STITCH")
            etat, detail = "agit", "%d → %d points" % nb
        else:
            etat, detail = "aucun effet visible", ""
        resultats.append({"type": typ, "nom": n, "libelle": p.get("libelle"), "contexte": contexte, "valeur": v,
                          "etat": etat, "detail": detail})
        print("%-13s %-40s %-20s %s" % (typ, n, etat, detail), flush=True)
json.dump(resultats, open(SORTIE, "w"), ensure_ascii=False, indent=1)
print("durée %.0f s, %d appels Ink/Stitch" % (time.time() - t0, len(cache)))
