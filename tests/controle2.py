"""Deuxième passage : réglages sans effet au premier essai, avec les bonnes conditions."""
import json, sys
sys.path.insert(0, sys.argv[1])
exec(open(sys.argv[3]).read().split("schema = M.schema()")[0])   # reprend les fonctions du premier passage

FORMES["satin_column"] = ('<path id="t" d="M 10,40 C 30,5 70,5 100,40 M 22,40 C 36,18 64,18 88,40 M 16,22 L 26,30 M 55,6 L 55,22 M 92,22 L 82,30" '
                          'style="fill:none;stroke:#2c3e50;stroke-width:0.5" inkstitch:satin_column="True" {a}/>')
FORMES["ripple"] = '<path id="t" d="M 40,35 m -20,0 a 20,20 0 1 0 40,0 a 20,20 0 1 0 -40,0 z" style="fill:none;stroke:#27ae60;stroke-width:0.3" {a}/>'
FORMES["avant"] = ('<rect id="avant" x="100" y="5" width="10" height="8" style="fill:#2c3e50;stroke:none"/>' + FORMES["satin_column"])
ALEA = {"enable_random_stitch_length": "True"}
ESSAIS = [  # (type de forme, réglage, contexte, valeur)
 ("clone", "flip_angle", {"angle": "30"}, "True"),
 ("element", "force_lock_stitches", {"ties": "3", "min_stitch_length_mm": "0"}, "True"),
 ("fill_stitch", "clip", {"fill_method": "meander_fill", "meander_scale_percent": "300"}, "True"),
 ("fill_stitch", "zigzag_width_mm", {"fill_method": "meander_fill", "zigzag_spacing_mm": "1"}, "2.5"),
 ("fill_stitch", "running_stitch_tolerance_mm", {"fill_method": "contour_fill"}, "1.5"),
 ("fill_stitch", "random_stitch_length_jitter_percent", dict(ALEA, fill_method="tatami_fill"), "40"),
 ("fill_stitch", "random_seed", dict(ALEA, fill_method="tatami_fill"), "12345"),
 ("satin_column", "split_method", {"max_stitch_length_mm": "3"}, "staggered"),
 ("satin_column", "random_split_jitter_percent", {"max_stitch_length_mm": "3"}, "40"),
 ("satin_column", "random_split_phase", {"max_stitch_length_mm": "3"}, "True"),
 ("satin_column", "min_random_split_length_mm", {"max_stitch_length_mm": "3", "random_split_phase": "True"}, "6"),
 ("satin_column", "split_staggers", {"max_stitch_length_mm": "3", "split_method": "staggered"}, "2"),
 ("satin_column", "short_stitch_inset", {"short_stitch_distance_mm": "1"}, "60"),
 ("satin_column", "running_stitch_tolerance_mm", {"center_walk_underlay": "True"}, "2"),
 ("avant", "start_at_nearest_point", {}, "False"),
 ("satin_column", "contour_underlay", {}, "True"),
 ("satin_column", "center_walk_underlay", {}, "True"),
 ("satin_column", "zigzag_underlay", {}, "True"),
 ("satin_column", "center_walk_underlay_stitch_tolerance_mm", {"center_walk_underlay": "True"}, "2"),
 ("satin_column", "center_walk_underlay_repeats", {"center_walk_underlay": "True"}, "4"),
 ("satin_column", "random_seed", {"random_width_increase_percent": "30"}, "12345"),
 ("stroke", "running_stitch_tolerance_mm", {"stroke_method": "running_stitch", "running_stitch_length_mm": "6"}, "2"),
 ("stroke", "random_stitch_length_jitter_percent", dict(ALEA, stroke_method="running_stitch"), "40"),
 ("stroke", "random_seed", dict(ALEA, stroke_method="running_stitch"), "12345"),
 ("ripple", "skip_end", {"stroke_method": "ripple_stitch", "line_count": "6"}, "2"),
 ("ripple", "flip_exponent", {"stroke_method": "ripple_stitch", "exponent": "2"}, "True"),
 ("ripple", "grid_first", {"stroke_method": "ripple_stitch", "grid_size_mm": "3"}, "True"),
 ("ripple", "scale_axis", {"stroke_method": "ripple_stitch", "scale_end": "50"}, "1"),
 ("ripple", "scale_start", {"stroke_method": "ripple_stitch"}, "50"),
 ("ripple", "scale_end", {"stroke_method": "ripple_stitch"}, "50"),
 ("ripple", "rotate_ripples", {"stroke_method": "ripple_stitch"}, "False"),
 ("ripple", "satin_guide_pattern_position", {"stroke_method": "ripple_stitch"}, "adaptive"),
 ("ripple", "reverse_rails", {"stroke_method": "ripple_stitch"}, "first"),
 ("ripple", "swap_satin_rails", {"stroke_method": "ripple_stitch"}, "True"),
 ("fill_stitch", "guided_fill_strategy", {"fill_method": "guided_fill"}, "1"),
 ("fill_stitch", "guided_fill_angle", {"fill_method": "guided_fill"}, "30"),
 ("fill_stitch", "stitch_position_method", {"fill_method": "guided_fill"}, "flexible_stagger"),
]
res = []
for forme, n, ctx, v in ESSAIS:
    base, e1 = points(forme, ctx)
    modif, e2 = points(forme, dict(ctx, **{n: v}))
    if base is None or modif is None:
        etat = "erreur " + " ".join(e1 + e2)[:120]
    else:
        etat = "agit" if base != modif else "aucun effet visible"
    res.append({"forme": forme, "nom": n, "contexte": ctx, "valeur": v, "etat": etat})
    print("%-12s %-38s %s" % (forme, n, etat), flush=True)
json.dump(res, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
