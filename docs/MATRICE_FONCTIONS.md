# Matrice des fonctions Ink/Stitch v3.3.0 → Panneau de broderie

Source : lecture de l'installation réelle d'Ink/Stitch (146 fichiers de commandes `.inx` et 139 définitions de réglages).

**États** : `testé` = vérifié par un essai réel avec le moteur Ink/Stitch ; `accessible` = présent dans le panneau, écrit le même attribut qu'Ink/Stitch, pas testé individuellement ; `Inkscape` = reste dans Inkscape (non concerné).

## 0. Ink/Stitch ↔ Broderie : où trouver chaque fonction

Vérification faite le 24/10/2026 sur Ink/Stitch v3.3.0.

États :
- **testé** : essayé avec le moteur Ink/Stitch ;
- **accessible** : présent, mais pas essayé une à une ;
- **Inkscape** : se fait dans Inkscape.

| Fonction Ink/Stitch | Dans Broderie | État |
|---|---|---|
| Paramètres (139 réglages : remplissage, satin, trait, clone, généraux) | Objets › tuiles « Type de point », curseurs essentiels, « Plus de réglages » par thèmes (tous les réglages, aucun masqué hors condition de méthode) | testé (types, densité, angle, longueur, sous-couches, coupe/arrêt) ; accessible (les autres) |
| Motifs de méandre (75) | Objets › Méandre › grille d'images | testé (liste) |
| Fenêtre Paramètres d'origine | Export › Toutes les commandes › Paramètres | accessible |
| Aperçu du plan de broderie : points, sauts, pénétrations (gros points de la couleur du fil), symboles de commande | Aperçu (Objets et Aperçu) › Points + cases Sauts / Pénétrations / Symboles | testé |
| Rendu réaliste (image 300/600 ppp) | Aperçu › Réaliste (600 ppp), tissu et ombre | testé |
| Rendu réaliste vectoriel | retiré (trop de mémoire sur 8 Go) | — |
| Simulateur : lecture, recommencer, plus lent / plus rapide, point précédent / suivant, commande précédente / suivante, sens de l'animation | onglet Points : mêmes boutons et icônes qu'Ink/Stitch, mêmes raccourcis (P, R, ↑↓, ←→, + −, Pg↑ Pg↓, O) | testé |
| Simulateur : affichage pénétrations (!), sauts (grenouille), coupes (ciseaux), arrêts, changements de couleur (bobine), mire, page, couleur du fond | onglet Points : boutons à bascule avec les icônes d'Ink/Stitch, repères des commandes sur la barre de progression | testé (sauts, changements de couleur, mire, infos) |
| Simulateur : informations (dimensions, points, changements de couleur, sauts, coupes, arrêts) et commande en cours | onglet Points › ⓘ, étiquette « Commande : … » | testé |
| Simulateur : préférences (vitesse adaptée au nombre de points, épaisseur du fil, taille des pénétrations, rayon / épaisseur / couleur de la mire) | onglet Points › ⚙ | accessible |
| Simulateur : fenêtre détachable | sans objet (le panneau est déjà une fenêtre à part) | — |
| Lettrage (texte, police, échelle, alignement, espacements, interligne, coupes, tri des couleurs, symboles) | Objets › + Texte (140 polices avec aperçu) | testé (texte multiligne, police, échelle, espacements, coupes) |
| Lettrage le long d'un chemin | Texte choisi › Texte courbé | testé |
| Autres outils de lettrage (gestion des polices, JSON, kerning…) | Export › Toutes les commandes | accessible |
| Colonne satin (rails + traverses en un objet) | Objets › Rails et traverses › Assembler | testé |
| Trait en satin, auto-satin, couper le satin, inverser les rails, satin en trait | tuile Satin ; Objets › Outils | testé (trait en satin, auto-satin) |
| Remplissage en trait, knockdown, redwork, auto-route point droit | Objets › Outils | testé (commandes) |
| Ordre de couture | Objets › ▲▼ | testé |
| Couleurs des fils | Objets › Couleur | testé |
| Palettes, liste de fils, gestion des couleurs | Export › Toutes les commandes | accessible (palette : testé) |
| Commandes (coupe, arrêt, ignorer, début/fin, symboles) | réglages « Couper le fil / Arrêter la machine » ; Toutes les commandes | testé (coupe) |
| Export (21 formats) | Export › format (+ marque de machine), cadre, vérification de taille, durée estimée | testé (DST, PES) ; accessible (autres) |
| Import de fichiers de broderie (50 formats) | Inkscape (Fichier › Ouvrir) | Inkscape |
| Impression PDF, préférences, dépannage, infos élément, éditeur de couches | Export › Toutes les commandes (fenêtre Ink/Stitch) | accessible |
| Sélectionner des éléments par type | menu Ink/Stitch d'Inkscape (agit sur la sélection d'Inkscape) | Inkscape |
| Copier des réglages d'un objet à l'autre (« Dupliquer les paramètres ») | Objets › Copier / Coller / Coller sur tous les… | testé |
| Dessiner, déplacer, tourner, agrandir | Inkscape | Inkscape |

## 1. Réglages de broderie (Ink/Stitch › Paramètres)

Accès actuel : Extensions › Ink/Stitch › Paramètres (fenêtre séparée). Stockage : attribut `inkstitch:<nom>` sur l'objet SVG, identique dans le panneau.

| Type | Réglage (attribut) | Libellé Ink/Stitch | Type de valeur | Condition d'affichage | Emplacement prévu | Niveau | État |
|---|---|---|---|---|---|---|---|
| clone | `clone` | Clone | toggle | toujours | Propriétés › Clone | courant | accessible |
| clone | `angle` | Custom fill angle | float (deg) | toujours | Propriétés › Clone | courant | accessible |
| clone | `flip_angle` | Flip angle | boolean | toujours | Propriétés › Clone | avancé | accessible |
| element | `min_stitch_length_mm` | Minimum stitch length | float (mm) | toujours | Propriétés › Général | avancé | accessible |
| element | `min_jump_stitch_length_mm` | Minimum jump stitch length | float (mm) | toujours | Propriétés › Général | avancé | accessible |
| element | `ties` | Allow lock stitches | dropdown | toujours | Propriétés › Général | courant | accessible |
| element | `force_lock_stitches` | Force lock stitches | boolean | toujours | Propriétés › Général | avancé | accessible |
| element | `lock_custom_start` | Custom path | string | lock_start=custom | Propriétés › Général | avancé | accessible |
| element | `lock_custom_end` | Custom path | string | lock_end=custom | Propriétés › Général | avancé | accessible |
| element | `trim_after` | Trim After | boolean | toujours | Propriétés › Général | courant | accessible |
| element | `stop_after` | Stop After | boolean | toujours | Propriétés › Général | courant | accessible |
| fill_stitch | `fill` | Fill stitching | toggle | toujours | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `fill_method` | Fill method | combo | toujours | Propriétés › Remplissage | courant | testé |
| fill_stitch | `guided_fill_strategy` | Guided Fill Strategy | dropdown | fill_method=guided_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `contour_strategy` | Contour Fill Strategy | dropdown | fill_method=contour_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `join_style` | Join Style | dropdown | fill_method=contour_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `avoid_self_crossing` | Avoid self-crossing | boolean | fill_method=contour_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `clockwise` | Clockwise | boolean | fill_method=contour_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `meander_pattern` | Meander Pattern | combo | fill_method=meander_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `meander_angle` | Meander pattern angle | float (degrees) | fill_method=meander_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `meander_scale_percent` | Meander pattern scale | float (%) | fill_method=meander_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `clip` | Clip path | boolean | fill_method=meander_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `smoothness_mm` | Smoothness | float (mm) | fill_method=contour_fill; fill_method=guided_fill; fill_method=mean… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `expand_mm` | Expand | float (mm) | toujours | Propriétés › Remplissage | courant | accessible |
| fill_stitch | `gap_fill_rows` | Gap Filling | int (rows) | fill_method=tatami_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `angle` | Angle of lines of stitches | float (deg) | fill_method=tatami_fill; fill_method=legacy_fill | Propriétés › Remplissage | courant | accessible |
| fill_stitch | `guided_fill_angle` | Guide copy angle | float (deg) | fill_method=guided_fill; guided_fill_strategy=0 | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `tartan_angle` | Angle of lines of stitches | float (deg) | fill_method=tartan_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `max_stitch_length_mm` | Maximum fill stitch length | float (mm) | fill_method=tatami_fill; fill_method=contour_fill; fill_method=guid… | Propriétés › Remplissage | courant | accessible |
| fill_stitch | `row_spacing_mm` | Spacing between rows | float (mm) | fill_method=tatami_fill; fill_method=contour_fill; fill_method=guid… | Propriétés › Remplissage | courant | testé |
| fill_stitch | `end_row_spacing_mm` | End row spacing | float (mm) | fill_method=tatami_fill; fill_method=circular_fill; fill_method=leg… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `stitch_position_method` | Stitch position method | combo | fill_method=guided_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `staggers` | Stagger rows this many times before repeating | int | fill_method=tatami_fill; fill_method=guided_fill; fill_method=linea… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `skip_last` | Skip last stitch in each row | boolean | fill_method=tatami_fill; fill_method=guided_fill; fill_method=linea… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `flip` | Flip fill (start right-to-left) | boolean | fill_method=legacy_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `reverse` | Reverse fill | boolean | fill_method=legacy_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `stop_at_ending_point` | Stop at ending point | boolean | fill_method=linear_gradient_fill; fill_method=tartan_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `underpath` | Underpath | boolean | fill_method=tatami_fill; fill_method=guided_fill; fill_method=circu… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `running_stitch_length_mm` | Running stitch length | float (mm) | fill_method=tatami_fill; fill_method=guided_fill; fill_method=meand… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `running_stitch_tolerance_mm` | Running stitch tolerance | float (mm) | fill_method=tatami_fill; fill_method=contour_fill; fill_method=guid… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `enable_random_stitch_length` | Randomize stitch length | boolean | fill_method=tatami_fill; fill_method=contour_fill; fill_method=guid… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `random_stitch_length_jitter_percent` | Random stitch length jitter | float (± %) | fill_method=tatami_fill; fill_method=contour_fill; fill_method=guid… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `repeats` | Repeats | int | fill_method=meander_fill; fill_method=contour_fill; fill_method=cir… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `bean_stitch_repeats` | Bean stitch number of repeats | str | fill_method=meander_fill; fill_method=circular_fill; fill_method=co… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `zigzag_spacing_mm` | Zig-zag spacing (peak-to-peak) | float (mm) | fill_method=meander_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `zigzag_width_mm` | Zig-zag width | float (mm) | fill_method=meander_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `rows_per_thread` | Rows per tartan thread | int | fill_method=tartan_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `herringbone_width_mm` | Herringbone width | int (mm) | fill_method=tartan_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `pull_compensation_mm` | Pull compensation | float (mm (each side)) | fill_method=tatami_fill | Propriétés › Remplissage | courant | accessible |
| fill_stitch | `pull_compensation_percent` | Pull compensation percentage | float (% (each side)) | fill_method=tatami_fill | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `fill_underlay` | Underlay | toggle | toujours | Propriétés › Remplissage › Fill Underlay | courant | accessible |
| fill_stitch | `fill_underlay_angle` | Fill angle | float (deg) | toujours | Propriétés › Remplissage › Fill Underlay | avancé | accessible |
| fill_stitch | `fill_underlay_row_spacing_mm` | Row spacing | float (mm) | toujours | Propriétés › Remplissage › Fill Underlay | avancé | accessible |
| fill_stitch | `fill_underlay_max_stitch_length_mm` | Max stitch length | float (mm) | toujours | Propriétés › Remplissage › Fill Underlay | avancé | accessible |
| fill_stitch | `fill_underlay_inset_mm` | Inset | float (mm) | toujours | Propriétés › Remplissage › Fill Underlay | avancé | accessible |
| fill_stitch | `fill_underlay_skip_last` | Skip last stitch in each row | boolean | toujours | Propriétés › Remplissage › Fill Underlay | avancé | accessible |
| fill_stitch | `underlay_underpath` | Underpath | boolean | toujours | Propriétés › Remplissage › Fill Underlay | avancé | accessible |
| fill_stitch | `random_seed` | Random seed | random_seed | fill_method=tatami_fill; fill_method=contour_fill; fill_method=guid… | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `cross_stitch_method` | Cross stitch method | combo | fill_method=cross_stitch | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `cross_thread_count` | Thread count | int | fill_method=cross_stitch | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `pattern_size_mm` | Pattern size | float (mm (x y)) | fill_method=cross_stitch | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `canvas_grid_origin` | Align grid with canvas | boolean | fill_method=cross_stitch | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `cross_offset_mm` | Grid Offset | float (mm (x y)) | fill_method=cross_stitch | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `cross_rotation` | Grid Rotation | float (deg) | fill_method=cross_stitch | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `fill_coverage` | Fill coverage | int (%) | fill_method=cross_stitch | Propriétés › Remplissage | avancé | accessible |
| fill_stitch | `max_cross_stitch_length_mm` | Maximum stitch length | float (mm) | fill_method=cross_stitch | Propriétés › Remplissage | avancé | accessible |
| satin_column | `satin_column` | Custom satin column | toggle | toujours | Propriétés › Colonne satin | courant (Type de trait) | testé |
| satin_column | `satin_method` | Method | combo | toujours | Propriétés › Colonne satin | courant | accessible |
| satin_column | `random_width_decrease_percent` | Random percentage of satin width decrease | float (% (each side)) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `random_width_increase_percent` | Random percentage of satin width increase | float (% (each side)) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `random_zigzag_spacing_percent` | Random zig-zag spacing percentage | float (± %) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `split_method` | Split Method | combo | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `max_stitch_length_mm` | Maximum stitch length | float (mm) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `random_split_jitter_percent` | Random jitter for split stitches | float (± %) | split_method=default | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `random_split_phase` | Random phase for split stitches | boolean | split_method=default | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `min_random_split_length_mm` | Minimum length for random-phase split | float (mm) | split_method=default | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `split_staggers` | Stagger split stitches this many times before repeating | float | split_method=staggered | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `short_stitch_inset` | Short stitch inset | float (%) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `short_stitch_distance_mm` | Short stitch distance | float (mm) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `zigzag_spacing_mm` | Zig-zag spacing (peak-to-peak) | float (mm/cycle) | toujours | Propriétés › Colonne satin | courant | accessible |
| satin_column | `pull_compensation_percent` | Pull compensation percentage | float (% (each side)) | toujours | Propriétés › Colonne satin | courant | accessible |
| satin_column | `pull_compensation_mm` | Pull compensation | float (mm (each side)) | toujours | Propriétés › Colonne satin | courant | accessible |
| satin_column | `push_compensation_mm` | Push compensation | float (mm (each side)) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `reverse_rails` | Reverse rails | combo | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `swap_satin_rails` | Swap rails | boolean | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `running_stitch_length_mm` | Running stitch length | float (mm) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `running_stitch_tolerance_mm` | Running stitch tolerance | float (mm) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `running_stitch_position` | Running Stitch Position | float (%) | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `start_at_nearest_point` | Start at nearest point | boolean | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `end_at_nearest_point` | End at nearest point | boolean | toujours | Propriétés › Colonne satin | avancé | accessible |
| satin_column | `contour_underlay` | Contour underlay | toggle | toujours | Propriétés › Colonne satin › Contour Underlay | courant | accessible |
| satin_column | `contour_underlay_stitch_length_mm` | Stitch length | float (mm) | toujours | Propriétés › Colonne satin › Contour Underlay | avancé | accessible |
| satin_column | `contour_underlay_stitch_tolerance_mm` | Stitch tolerance | float (mm) | toujours | Propriétés › Colonne satin › Contour Underlay | avancé | accessible |
| satin_column | `contour_underlay_inset_mm` | Inset distance (fixed) | float (mm (each side)) | toujours | Propriétés › Colonne satin › Contour Underlay | avancé | accessible |
| satin_column | `contour_underlay_inset_percent` | Inset distance (proportional) | float (% (each side)) | toujours | Propriétés › Colonne satin › Contour Underlay | avancé | accessible |
| satin_column | `center_walk_underlay` | Center-walk underlay | toggle | toujours | Propriétés › Colonne satin › Center-Walk Underlay | courant | accessible |
| satin_column | `center_walk_underlay_stitch_length_mm` | Stitch length | float (mm) | toujours | Propriétés › Colonne satin › Center-Walk Underlay | avancé | accessible |
| satin_column | `center_walk_underlay_stitch_tolerance_mm` | Stitch tolerance | float (mm) | toujours | Propriétés › Colonne satin › Center-Walk Underlay | avancé | accessible |
| satin_column | `center_walk_underlay_repeats` | Repeats | int | toujours | Propriétés › Colonne satin › Center-Walk Underlay | avancé | accessible |
| satin_column | `center_walk_underlay_position` | Position | float (%) | toujours | Propriétés › Colonne satin › Center-Walk Underlay | avancé | accessible |
| satin_column | `zigzag_underlay` | Zig-zag underlay | toggle | toujours | Propriétés › Colonne satin › Zig-zag Underlay | courant | accessible |
| satin_column | `zigzag_underlay_spacing_mm` | Zig-Zag spacing (peak-to-peak) | float (mm) | toujours | Propriétés › Colonne satin › Zig-zag Underlay | avancé | accessible |
| satin_column | `zigzag_underlay_inset_mm` | Inset amount (fixed) | float (mm (each side)) | toujours | Propriétés › Colonne satin › Zig-zag Underlay | avancé | accessible |
| satin_column | `zigzag_underlay_inset_percent` | Inset amount (proportional) | float (% (each side)) | toujours | Propriétés › Colonne satin › Zig-zag Underlay | avancé | accessible |
| satin_column | `zigzag_underlay_max_stitch_length_mm` | Maximum stitch length | float (mm) | toujours | Propriétés › Colonne satin › Zig-zag Underlay | avancé | accessible |
| satin_column | `random_seed` | Random seed | random_seed | toujours | Propriétés › Colonne satin | avancé | accessible |
| stroke | `satin_column` | Running stitch along paths | toggle | toujours | Propriétés › Contour | avancé | accessible |
| stroke | `stroke_method` | Method | combo | toujours | Propriétés › Contour | courant | accessible |
| stroke | `repeats` | Repeats | int | stroke_method=running_stitch; stroke_method=ripple_stitch; stroke_m… | Propriétés › Contour | courant | accessible |
| stroke | `bean_stitch_repeats` | Bean stitch number of repeats | str | stroke_method=running_stitch; stroke_method=ripple_stitch; stroke_m… | Propriétés › Contour | courant | testé |
| stroke | `manual_pattern_placement` | Manual stitch placement | boolean | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `running_stitch_length_mm` | Running stitch length | string (mm) | stroke_method=running_stitch; stroke_method=ripple_stitch | Propriétés › Contour | courant | accessible |
| stroke | `running_stitch_tolerance_mm` | Stitch tolerance | float (mm) | stroke_method=running_stitch; stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `enable_random_stitch_length` | Randomize stitch length | boolean | stroke_method=running_stitch; stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `random_stitch_length_jitter_percent` | Random stitch length jitter | float (± %) | stroke_method=running_stitch; stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `max_stitch_length_mm` | Max stitch length | float (mm) | stroke_method=manual_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `zigzag_spacing_mm` | Zig-zag spacing (peak-to-peak) | string (mm) | stroke_method=zigzag_stitch | Propriétés › Contour | courant | accessible |
| stroke | `stroke_pull_compensation_mm` | Pull compensation | float (mm (each side)) | stroke_method=zigzag_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `zigzag_angle` | Zig-zag angle | float (°) | stroke_method=zigzag_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `line_count` | Number of lines | int | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `min_line_dist_mm` | Minimum line distance | float (mm) | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `satin_guide_pattern_position` | Pattern position | combo | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `staggers` | Stagger lines this many times before repeating | int | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `skip_start` | Skip first lines | int | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `skip_end` | Skip last lines | int | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `flip_copies` | Flip every second line | boolean | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `exponent` | Line distance exponent | float | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `flip_exponent` | Flip exponent | boolean | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `reverse` | Reverse | boolean | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `reverse_rails` | Reverse rails | combo | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `swap_satin_rails` | Swap rails | boolean | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `grid_size_mm` | Grid size | float (mm) | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `grid_first` | Stitch grid first | boolean | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `scale_axis` | Scale axis | dropdown | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `scale_start` | Starting scale | float (%) | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `scale_end` | Ending scale | float (%) | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `rotate_ripples` | Rotate | boolean | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `join_style` | Join style | dropdown | stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |
| stroke | `random_seed` | Random seed | random_seed | stroke_method=running_stitch; stroke_method=ripple_stitch | Propriétés › Contour | avancé | accessible |

Total : 139 réglages.

## 2. Commandes Ink/Stitch (menu Extensions › Ink/Stitch)

Toutes sont dans le panneau, à « Toutes les commandes… » : noms en français, recherche, options avec sélecteur de fichier ou de couleur. Celles qui conviennent au type d'objet choisi apparaissent aussi dans **Propriétés › Outils**.

États :
- `testé` : exécutée pour de vrai par le moteur sur un dessin d'essai, avec ses options par défaut, sans erreur. Une commande qui attend une donnée (nom, fichier…) répond par son message normal, et ce message s'affiche dans le panneau ;
- `fenêtre` : ouvre sa propre fenêtre Ink/Stitch, lancée depuis le panneau sans bloquer Inkscape ; non testée une par une ;
- `Inkscape` : agit sur la sélection d'Inkscape et s'utilise donc depuis le menu Ink/Stitch.

| Menu actuel | Commande | Identifiant | Emplacement prévu | État | Réponse lors de l'essai |
|---|---|---|---|---|---|
| Ink/Stitch | About | `about` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch | Cutwork segmentation | `cutwork_segmentation` | Toutes les commandes… | testé (après correction des couleurs) | inkex.colors.ColorError: 'Unknown color format: 0x990000ff' |
| Ink/Stitch | Install Addons for Inkscape | `install` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch | Params | `params` | Barre d'outils › Paramètres Ink/Stitch ; Propriétés (réglages) | fenêtre |  |
| Ink/Stitch | Preferences | `preferences` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Commands | Add Commands | `global_commands` | Toutes les commandes… | testé | Please choose one or more commands to add. |
| Ink/Stitch/Commands | Add Layer Commands | `layer_commands` | Toutes les commandes… | testé | Please choose one or more commands to add. |
| Ink/Stitch/Commands | Attach Commands to Selected Objects | `object_commands` | Toutes les commandes… | testé | Please choose one or more commands to attach. |
| Ink/Stitch/Commands | Jump Stitch to Trim/Stop Command | `jump_to_trim` | Toutes les commandes… | testé |  |
| Ink/Stitch/Commands/View | Scale Command Symbols | `commands_scale_symbols` | Toutes les commandes… | testé |  |
| Ink/Stitch/Commands/View | Show|Hide Object Commands | `object_commands_toggle_visibility` | Toutes les commandes… | testé |  |
| Ink/Stitch/Edit | Apply attribute | `apply_attribute` | Toutes les commandes… | testé | Please enter the attribute name. |
| Ink/Stitch/Edit | Duplicate Params | `duplicate_params` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Edit | Generate Test Swatches from Selection | `test_swatches` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Edit | Re-stack objects in order of selection | `reorder` | Toutes les commandes… | testé |  |
| Ink/Stitch/Edit | Remove duplicated points | `remove_duplicated_points` | Toutes les commandes… | testé |  |
| Ink/Stitch/Edit | Select embroidery elements | `select_elements` | Toutes les commandes… | Inkscape | Could not detect python path. Please insert python path manually as described in the help  |
| Ink/Stitch/Edit | Selection to anchor line | `selection_to_anchor_line` | Toutes les commandes… | testé |  |
| Ink/Stitch/Edit | Selection to guide line | `selection_to_guide_line` | Toutes les commandes… | testé |  |
| Ink/Stitch/Edit | Selection to pattern | `selection_to_pattern` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Edit | Transform | `transform_elements` | Toutes les commandes… | testé |  |
| Ink/Stitch/Edit | Unlink Clone | `unlink_clone` | Toutes les commandes… | testé |  |
| Ink/Stitch/Font Management | Convert SVG Font to Glyph Layers | `lettering_svg_font_to_layers` | Toutes les commandes… | testé | There are no svg fonts |
| Ink/Stitch/Font Management | Custom font directory | `lettering_custom_font_dir` | Toutes les commandes… | accessible |  |
| Ink/Stitch/Font Management | Edit JSON | `lettering_edit_json` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Font Management | Font Sampling | `lettering_font_sample` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Font Management | Force lock stitches | `lettering_force_lock_stitches` | Toutes les commandes… | testé |  |
| Ink/Stitch/Font Management | Generate JSON | `lettering_generate_json` | Toutes les commandes… | testé | Please specify a font file. |
| Ink/Stitch/Font Management | Letters to font | `letters_to_font` | Toutes les commandes… | testé | Font directory not found. Please specify an existing directory. |
| Ink/Stitch/Font Management | Organize Glyphs | `lettering_organize_glyphs` | Toutes les commandes… | testé | Either  fill them or delete them |
| Ink/Stitch/Font Management | Remove Kerning | `lettering_remove_kerning` | Toutes les commandes… | testé |  |
| Ink/Stitch/Font Management | Set color sort index | `lettering_set_color_sort_index` | Toutes les commandes… | testé |  |
| Ink/Stitch/Lettering | Lettering Tool | `lettering` | Barre d'outils › Lettrage | fenêtre |  |
| Ink/Stitch/Lettering | Lettering along path | `lettering_along_path` | Toutes les commandes… | testé | Please select one path and one Ink/Stitch lettering group. |
| Ink/Stitch/Thread Color Management | Apply Palette | `apply_palette` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Thread Color Management | Apply Threadlist | `apply_threadlist` | Toutes les commandes… | testé : attend un fichier (bouton Choisir…) | File not found. |
| Ink/Stitch/Thread Color Management | Install custom palette | `install_custom_palette` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Thread Color Management | Palette to text | `palette_to_text` | Toutes les commandes… | testé : attend un fichier (bouton Choisir…) | TypeError: stat: path should be string, bytes, os.PathLike or integer, not NoneType |
| Ink/Stitch/Thread Color Management/Generate Palette | Generate Color Palette | `generate_palette` | Toutes les commandes… | testé | Please specify a name for your color palette. |
| Ink/Stitch/Thread Color Management/Generate Palette | Split text | `palette_split_text` | Toutes les commandes… | testé |  |
| Ink/Stitch/Tools: Fill | Break Apart Fill Objects | `break_apart` | Toutes les commandes… | testé |  |
| Ink/Stitch/Tools: Fill | Convert to gradient blocks | `gradient_blocks` | Toutes les commandes… ; Propriétés › Outils | testé | Please select at least one object with a gradient fill. |
| Ink/Stitch/Tools: Fill | Cross Stitch Assistant | `cross_stitch_assistant` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Tools: Fill | Selection to Knockdown Fill | `knockdown_fill` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Tools: Fill | Tartan | `tartan` | Toutes les commandes… ; Propriétés › Outils | fenêtre |  |
| Ink/Stitch/Tools: Satin | Auto-Route Satin Columns | `auto_satin` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Tools: Satin | Cut Satin Column | `cut_satin` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Tools: Satin | Fill to satin | `fill_to_satin` | Toutes les commandes… ; Propriétés › Outils | fenêtre |  |
| Ink/Stitch/Tools: Satin | Flip Satin Column Rails | `flip` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Tools: Satin | Multicolor Satin | `satin_multicolor` | Toutes les commandes… ; Propriétés › Outils | fenêtre |  |
| Ink/Stitch/Tools: Satin | Stroke to Live Path Effect Satin | `stroke_to_lpe_satin` | Toutes les commandes… | testé | Cannot convert a satin column into a live path effect satin. Please select a stroke. |
| Ink/Stitch/Tools: Satin | Stroke to Satin | `stroke_to_satin` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Tools: Satin | Zig-Zag Line to Satin | `zigzag_line_to_satin` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Tools: Stroke | Auto-Route Running Stitch | `auto_run` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Tools: Stroke | Fill to Stroke | `fill_to_stroke` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Tools: Stroke | Jump Stitch to Stroke | `jump_to_stroke` | Toutes les commandes… | testé |  |
| Ink/Stitch/Tools: Stroke | Outline | `outline` | Toutes les commandes… ; Propriétés › Outils | testé | Could not generate path from element trait_large with the given settings. |
| Ink/Stitch/Tools: Stroke | Redwork | `redwork` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Tools: Stroke | Satin to Stroke | `satin_to_stroke` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Troubleshoot | Cleanup Document | `cleanup` | Toutes les commandes… | testé | 0 groups/layers to remove: |
| Ink/Stitch/Troubleshoot | Element Info | `element_info` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Troubleshoot | Remove embroidery settings | `remove_embroidery_settings` | Toutes les commandes… ; Propriétés › Outils | testé |  |
| Ink/Stitch/Troubleshoot | Troubleshoot Objects | `troubleshoot` | Toutes les commandes… ; Propriétés › Outils | testé | If you are still having trouble with a shape not being embroidered, check if it is in a la |
| Ink/Stitch/Troubleshoot | Update inkstitch svg | `update_svg` | Toutes les commandes… | testé |  |
| Ink/Stitch/Visualize and Export | Density Map | `density_map` | Toutes les commandes… | testé |  |
| Ink/Stitch/Visualize and Export | Display stacking order | `display_stacking_order` | Toutes les commandes… | testé |  |
| Ink/Stitch/Visualize and Export | PDF Export | `print` | Toutes les commandes… | fenêtre |  |
| Ink/Stitch/Visualize and Export | Simulator | `simulator` | Barre d'outils › Simulateur | fenêtre |  |
| Ink/Stitch/Visualize and Export | Stitch Plan Preview | `stitch_plan_preview` | Aperçu (zone centrale, automatique) | testé |  |
| Ink/Stitch/Visualize and Export | Undo Stitch Plan Preview | `stitch_plan_preview_undo` | Toutes les commandes… | Inkscape |  |

## 3. Export (Fichier › Enregistrer une copie, formats Ink/Stitch)

| Format | Emplacement prévu | État |
|---|---|---|
|  | Barre d'outils › Exporter | accessible |
|  | Barre d'outils › Exporter | accessible |
|  | Barre d'outils › Exporter | accessible |
|  | Barre d'outils › Exporter | accessible |
|  | Barre d'outils › Exporter | accessible |
| COL | Barre d'outils › Exporter | accessible |
| CSV | Barre d'outils › Exporter | accessible |
| DST | Barre d'outils › Exporter | testé |
| EDR | Barre d'outils › Exporter | accessible |
| EXP | Barre d'outils › Exporter | accessible |
| GCODE | Barre d'outils › Exporter | accessible |
| INF | Barre d'outils › Exporter | accessible |
| JEF | Barre d'outils › Exporter | accessible |
| JSON | Barre d'outils › Exporter | accessible |
| PEC | Barre d'outils › Exporter | accessible |
| PES | Barre d'outils › Exporter | testé |
| PLT | Barre d'outils › Exporter | accessible |
| PMV | Barre d'outils › Exporter | accessible |
| QCC | Barre d'outils › Exporter | accessible |
| SEW | Barre d'outils › Exporter | accessible |
| SVG | Barre d'outils › Exporter | accessible |
| TBF | Barre d'outils › Exporter | accessible |
| TXT | Barre d'outils › Exporter | accessible |
| U01 | Barre d'outils › Exporter | accessible |
| VP3 | Barre d'outils › Exporter | accessible |
| XXX | Barre d'outils › Exporter | accessible |

## 4. Import (Fichier › Ouvrir un fichier de broderie)

Les 50 formats d'import (100 file input, 10O file input, BRO file input, COL file input, CSV file input, DAT file input, DSB file input, DST file input, DSZ file input, EDR file input, EMD file input, EXP file input, EXY file input, FXY file input, GCODE file input, GT file input, HUS file input, INB file input, INF file in…) restent gérés par Inkscape + Ink/Stitch à l'ouverture : `Inkscape`, non modifiés.

## 5. Fonctions du panneau lui-même

| Fonction | État |
|---|---|
| Liste des objets brodables (sélection ou tout le dessin) | testé |
| Ordre de couture (▲▼ parmi les objets voisins) | testé |
| Couleurs (remplacement de couleur) | testé |
| Mode avancé (tous les réglages) | accessible |
| Aller-retour avec Inkscape sans blocage (envoi du dessin, retour des réglages, modifications faites dans Inkscape conservées) | testé hors Inkscape (script lancé comme Inkscape le lance) ; à tester dans Inkscape |
| Aperçu recalculé à chaque changement, zoom net | testé |
| Raccourci ⌘⌥B (envoi du dessin / retour des réglages) | installé ; à essayer après redémarrage d'Inkscape |
| Menu Extensions › Broderie › Panneau de broderie lancé dans Inkscape | testé (dessin réel reçu par le panneau) |
| Commandes en arrière-plan (Inkscape et panneau restent utilisables) | testé |
| Abandonner les modifications en attente | accessible |

## 6. Contrôle automatique des 139 réglages (24/10/2026)

Méthode :
1. Pour chaque réglage, le moteur Ink/Stitch calcule les points d'un dessin d'essai avec la valeur par défaut, puis avec une autre valeur, dans les conditions où le réglage s'applique (bon type de point, sous-couche activée…).
2. Les deux listes de points sont comparées, coupes, sauts et arrêts compris.
3. Trois passages successifs, pour affiner les conditions.

Résultat : **131 réglages sur 137 changent bien les points**. Les 2 réglages restants (« Colonne satin personnalisée », trait et satin) sont les tuiles Satin du panneau, testées par ailleurs.

Réglages sans différence observée dans les conditions d'essai : ils sont présents et enregistrés comme les autres, mais leur effet n'a pas été démontré.

| Type | Réglage | Remarque |
|---|---|---|
| fill_stitch | `clip` (Contraindre le chemin à la forme) | méandre : l'essai sur petite forme a échoué (« forme trop petite ») |
| satin_column | `center_walk_underlay_stitch_tolerance_mm` (Tolérance) | sous-couche centrale : tracé trop régulier pour que la tolérance change les points |
| satin_column | `min_random_split_length_mm` (Longueur minimum du point si découpage totalement aléatoire) | satin découpé avec phase aléatoire : seuil non atteint dans l'essai |
| stroke | `rotate_ripples` (Tourner) | idem (cercle symétrique) |
| stroke | `satin_guide_pattern_position` (Position du motif) | ripple sur rails : nécessite un motif de guidage particulier |
| stroke | `scale_axis` (Mettre à l'échelle sur l'axe) | ripple avec ligne guide : effet non visible sur un cercle (symétrique) |

Réglages qui agissent : tous les autres, dont tous ceux affichés en curseurs et en tuiles dans le panneau.
