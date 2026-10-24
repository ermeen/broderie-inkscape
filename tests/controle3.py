import json, sys
sys.path.insert(0, sys.argv[1])
exec(open(sys.argv[3]).read().split("schema = M.schema()")[0])
GUIDE = ('<defs><marker id="inkstitch-guide-line-marker" orient="auto"><circle r="1"/></marker></defs>'
         '<path id="guide" d="M 12,38 C 25,15 40,35 48,12" style="fill:none;stroke:#999;stroke-width:0.3;marker-start:url(#inkstitch-guide-line-marker)"/>')
FORMES["remplissage_guide"] = '<g id="grp">' + GUIDE + '<path id="t" d="M 10,10 L 50,10 L 50,40 L 10,40 Z" style="fill:#c0392b;stroke:none" {a}/></g>'
FORMES["ripple_guide"] = ('<g id="grp">' + GUIDE.replace("12,38 C 25,15 40,35 48,12", "40,35 L 75,10") +
                          '<path id="t" d="M 40,35 m -15,0 a 15,15 0 1 0 30,0 a 15,15 0 1 0 -30,0 z" style="fill:none;stroke:#27ae60;stroke-width:0.3" {a}/></g>')
FORMES["ripple_satin"] = ('<path id="t" d="M 10,20 C 40,12 70,12 100,24 M 10,34 C 40,28 70,28 100,40 M 30,15 L 30,31 M 70,14 L 70,30" '
                          'style="fill:none;stroke:#27ae60;stroke-width:0.3" {a}/>')
FORMES["meandre_petit"] = '<path id="t" d="M 10,10 L 30,10 L 22,40 Z" style="fill:#c0392b;stroke:none" {a}/>'
R = {"stroke_method": "ripple_stitch"}
ESSAIS = [
 ("remplissage_guide", "guided_fill_strategy", {"fill_method": "guided_fill"}, "1"),
 ("remplissage_guide", "guided_fill_angle", {"fill_method": "guided_fill", "guided_fill_strategy": "0"}, "30"),
 ("remplissage_guide", "stitch_position_method", {"fill_method": "guided_fill"}, "flexible_stagger"),
 ("ripple_guide", "scale_start", R, "40"), ("ripple_guide", "scale_end", R, "40"),
 ("ripple_guide", "scale_axis", dict(R, scale_end="40"), "1"), ("ripple_guide", "rotate_ripples", R, "False"),
 ("ripple_satin", "satin_guide_pattern_position", R, "render_at_rungs"), ("ripple_satin", "reverse_rails", R, "first"),
 ("ripple_satin", "swap_satin_rails", R, "True"),
 ("meandre_petit", "clip", {"fill_method": "meander_fill", "meander_scale_percent": "400"}, "True"),
 ("satin_column", "min_random_split_length_mm", {"max_stitch_length_mm": "2", "random_split_phase": "True"}, "12"),
 ("satin_column", "center_walk_underlay_stitch_tolerance_mm", {"center_walk_underlay": "True", "center_walk_underlay_stitch_length_mm": "8"}, "3"),
]
res = []
for forme, n, ctx, v in ESSAIS:
    base, e1 = points(forme, ctx); modif, e2 = points(forme, dict(ctx, **{n: v}))
    etat = ("erreur " + " ".join(e1 + e2)[:120]) if base is None or modif is None else ("agit" if base != modif else "aucun effet visible")
    res.append({"forme": forme, "nom": n, "contexte": ctx, "valeur": v, "etat": etat})
    print("%-18s %-40s %s" % (forme, n, etat), flush=True)
json.dump(res, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
