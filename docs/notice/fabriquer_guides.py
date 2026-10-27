"""Fabrique les deux guides PDF du Panneau de broderie :
- docs/Guide-rapide-Broderie-<version>.pdf : deux pages à garder sous la main ;
- docs/Guide-complet-Broderie-<version>.pdf : toutes les fonctions, illustrées, avec les bonnes pratiques.

Utilisation : python3 fabriquer_guides.py   (Python avec reportlab)
Captures d'écran : docs/notice/images (prises avec Chrome sans fenêtre sur un dessin d'essai).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mise_en_page import (CMD, VERSION, RACINE, Chapitre, NextPageTemplate, PageBreak, Spacer, SABLE, ROSE_FONCE,  # noqa: E402
                          astuce, capture, cartes, document, encadre, etapes, mm, p, puces, tableau, touche)

DOCS = os.path.join(RACINE, "docs")
DOC = "https://inkstitch.org/fr/docs/"


def lien(url, texte=None):
    return '<link href="%s"><font color="#b25a6e"><u>%s</u></font></link>' % (url, texte or url)


# ================================================================ guide rapide (2 pages)
def guide_rapide():
    sortie = os.path.join(DOCS, "Guide-rapide-Broderie-%s.pdf" % VERSION)
    d = document(sortie, "Panneau de broderie — guide rapide %s" % VERSION, "Guide rapide", None,
                 "Panneau de broderie · guide rapide", couverture_pleine=False)
    c = [NextPageTemplate("page"),
         Chapitre("1", "Broder en six gestes", "Inkscape dessine, le panneau règle, Ink/Stitch calcule les points"),
         etapes("<b>Installer</b> (une fois) : Inkscape 1.4 et Ink/Stitch 3, puis double-clic sur <b>installer.command</b> "
                "(Mac) ou <b>Installer sous Windows.bat</b>. Relancez Inkscape.",
                "<b>Dessiner</b> dans Inkscape : formes remplies, traits, colonnes satin, texte.",
                "Appuyer sur " + CMD + " (Windows : Ctrl Alt B) : le panneau s'ouvre avec votre dessin.",
                "<b>Régler</b> dans l'onglet <b>Objets</b> : type de point en tuiles, curseurs, le petit <b>i</b> pour un conseil.",
                "<b>Vérifier</b> dans <b>Simulation</b> (la machine brode point par point, dans votre cadre).",
                "<b>Exporter</b> dans <b>Export</b> : « Vérifier avant d'exporter », puis le format de votre machine."),
         Spacer(1, 4 * mm),
         encadre("<b>Synchroniser</b> (ou " + CMD + ") fonctionne dans les deux sens : le panneau reprend le dessin d'Inkscape "
                 "et y renvoie vos réglages. <b>Orange</b> : des réglages attendent. <b>Bleu</b> : vous revenez d'Inkscape, "
                 "pensez à synchroniser. Puis <b>Cmd S</b> dans Inkscape pour enregistrer.", "LE RÉFLEXE"),
         p("Où faire quoi ?", "h2"),
         tableau([["Je veux…", "Où ?"],
                  ["Dessiner, déplacer, agrandir, supprimer", "Inkscape"],
                  ["Type de point, densité, compensation, sous-couches", "Objets › fiche de l'objet"],
                  ["Même couleur qu'un autre objet", "Objets › pastilles « Couleurs déjà dans le dessin »"],
                  ["Un texte brodé, en arc ou sur une courbe", "Objets › + Texte"],
                  ["Changer l'ordre de broderie", "Objets › glisser dans la liste (entre deux calques : bord haut du calque)"],
                  ["Voir la broderie, le cadre, le bâti", "Simulation"],
                  ["Tissu, stabilisateur, fil ; tout régler en auto", "Export › Préparer la broderie"],
                  ["Bobines, fichier machine, fiche à imprimer", "Export"]], [88, 82]),
         p("Touches utiles", "h2"),
         tableau([["Touche", "Effet"],
                  [CMD, "ouvrir le panneau / synchroniser"],
                  [touche("Cmd") + " " + touche("clic") + " · " + touche("Maj") + " " + touche("clic"), "choisir plusieurs objets · toute une suite"],
                  [touche("Échap"), "tout désélectionner (ou annuler un placement)"],
                  [touche("P") + " " + touche("R") + " · " + touche("+") + " " + touche("−"), "Simulation : lecture / recommencer · un point (bouton maintenu : défile)"]],
                 [60, 110]),
         PageBreak(),
         Chapitre("2", "Les bons réflexes", "Pour une broderie propre du premier coup"),
         *puces("<b>Choisissez votre profil</b> (Export › Préparer la broderie) : tissu, stabilisateur, fil. "
                "<b>Tout le dessin en auto</b> règle densité, compensation, sous-couches et découpe d'après ce profil et la "
                "forme de chaque objet. Chaque réglage reste modifiable : <b>Ink/Stitch · Auto · Main</b>.",
                "<b>Stabilisateur</b> : à déchirer pour les tissus tissés, à découper pour les mailles (tee-shirt, polo), "
                "film soluble dessus pour l'éponge et la polaire.",
                "<b>Satin</b> de 1,5 à 7 mm de large. Au-delà, découpez les longs points ou passez en remplissage : "
                "« Vérifier avant d'exporter » le signale.",
                "<b>Texte</b> d'au moins 5 mm de haut ; en dessous, une police « small ».",
                "<b>Fond d'abord, détails ensuite</b> ; regroupez les couleurs (Export › Préparer) pour moins de changements de fil.",
                "<b>Sauts</b> : « Couper » après les longs sauts, « Relier » les sauts courts entre formes de même couleur.",
                "Toujours un <b>essai sur une chute du même tissu</b>, avec le même stabilisateur."),
         Spacer(1, 3 * mm),
         cartes(("Densité (écart entre points)", ["Satin : 0,4 mm en fil 40, 0,35 en fil 60.",
                                                 "Remplissage : 0,4 mm en fil 40.",
                                                 "Trop serré = raide, casse d'aiguille : carte de densité (bouton carreaux)."]),
                ("Compensation", ["Le fil tire le tissu : on élargit.",
                                  "≈ 0,15 mm (colonne de 2 mm) à 0,3 mm (7 mm).",
                                  "Plus sur maille (≈ 0,4), moins sur toile et soie."]),
                ("Sous-couches satin", ["Centre : moins de 2 mm.", "Contour : de 2 à 4 mm.", "Contour + zigzag : au-delà, ou sur maille."]),
                ("En cas de doute", ["Le petit <b>i</b> à côté de chaque réglage.",
                                     "Le guide complet (PDF) livré avec le panneau.",
                                     "La documentation d'Ink/Stitch : " + lien(DOC, "inkstitch.org/fr/docs")])),
         Spacer(1, 4 * mm),
         astuce("Rien ne s'ouvre avec " + CMD + " ? Menu Extensions › Broderie › Panneau de broderie. "
                "« Panneau arrêté » : appuyez sur " + CMD + ", il redémarre sans perdre vos réglages en attente."),
         ]
    d.build(c)
    return sortie


# ================================================================ guide complet
def guide_complet():
    sortie = os.path.join(DOCS, "Guide-complet-Broderie-%s.pdf" % VERSION)
    d = document(sortie, "Panneau de broderie — guide complet %s" % VERSION, "Guide complet d'utilisation et bonnes pratiques",
                 "pour Inkscape et Ink/Stitch · guide complet", "Panneau de broderie · guide complet")
    c = [NextPageTemplate("page"), PageBreak()]

    # ---- 1. principe
    c += [Chapitre(1, "Le principe", "Chacun son rôle : le dessin, les réglages, les points"),
          p("Vous <b>dessinez dans Inkscape</b>, vous <b>réglez la broderie dans le panneau</b>, et <b>Ink/Stitch calcule "
            "les points</b>. Le panneau ne remplace ni Inkscape ni Ink/Stitch : il les rend simples à utiliser ensemble. "
            "Tous les réglages d'Ink/Stitch y sont, rangés par thème, en français, avec un conseil pour chacun.", "intro"),
          tableau([["Je veux…", "Où ?"],
                   ["Dessiner une forme, une courbe, une colonne satin", "Inkscape"],
                   ["Déplacer, tourner, agrandir, supprimer (formes et textes)", "Inkscape"],
                   ["Choisir le type de point, la densité, les sous-couches", "Panneau › Objets"],
                   ["Créer un texte brodé, le courber", "Panneau › Objets › + Texte"],
                   ["Changer l'ordre de broderie", "Panneau › Objets › glisser dans la liste"],
                   ["Voir les points, simuler, le cadre, le bâti", "Panneau › Simulation"],
                   ["Profil tissu / stabilisateur / fil, vérifier, exporter", "Panneau › Export"],
                   ["Enregistrer le travail", "Inkscape (Cmd S)"]], [105, 65]),
          Spacer(1, 6 * mm),
          p("Où sont enregistrés les réglages ?", "h2"),
          p("Dans votre fichier <b>.svg</b>, exactement comme Ink/Stitch les enregistre : le fichier reste utilisable avec les "
            "menus Ink/Stitch habituels, et un autre ordinateur sans le panneau le brodera de la même façon. Le profil de "
            "broderie (tissu, stabilisateur, fil) est lui aussi rangé dans le fichier."),
          PageBreak()]

    # ---- 2. installer
    c += [Chapitre(2, "Installer, mettre à jour, retirer"),
          p("Mac", "h2"),
          etapes("Il faut <b>Inkscape 1.4</b> et <b>Ink/Stitch 3</b> déjà installés (menu Extensions › Ink/Stitch présent).",
                 "Téléchargez l'archive <b>broderie-inkscape-%s.zip</b> et ouvrez-la." % VERSION,
                 "Double-cliquez sur <b>installer.command</b>. Si macOS refuse : clic droit › Ouvrir › Ouvrir.",
                 "Quittez Inkscape puis relancez-le : le raccourci " + CMD + " est actif.",
                 "Facultatif, pour le bouton <b>Synchroniser</b> : autorisez Inkscape dans Réglages Système › Confidentialité "
                 "et sécurité › <b>Accessibilité</b>."),
          p("Windows (version d'essai)", "h2"),
          etapes("Même archive : clic droit › Extraire tout.",
                 "Double-cliquez sur <b>Installer sous Windows.bat</b> (« Windows a protégé votre ordinateur » : "
                 "Informations complémentaires › Exécuter quand même).",
                 "Relancez Inkscape, puis <b>Ctrl+Alt+B</b>. Le panneau s'ouvre dans une fenêtre étroite d'Edge.",
                 "Partout dans ce guide, lisez <b>Ctrl</b> pour Cmd et <b>Alt</b> pour Option. Le bouton Synchroniser ne clique "
                 "pas le menu d'Inkscape sous Windows : appuyez sur Ctrl+Alt+B."),
          p("Mettre à jour, retirer", "h2"),
          *puces("Mettre à jour : relancez l'installation de la nouvelle version. Les réglages en attente sont gardés ; le "
                 "panneau passe à la nouvelle version au " + CMD + " suivant.",
                 "Retirer : <b>desinstaller.command</b> (Mac) ou <b>Desinstaller sous Windows.bat</b>. Ink/Stitch n'est jamais modifié."),
          PageBreak()]

    # ---- 3. le geste
    c += [Chapitre(3, "Le geste à retenir", "Un raccourci relie Inkscape et le panneau"),
          encadre(CMD + "&nbsp; dans Inkscape (ou Extensions › Broderie › Panneau de broderie)<br/>"
                  "• après avoir <b>dessiné ou modifié</b> dans Inkscape : le panneau reprend votre dessin ;<br/>"
                  "• après avoir <b>réglé</b> dans le panneau : les réglages passent dans le dessin (Cmd Z les annule).",
                  "LE RACCOURCI"),
          p("Le bouton Synchroniser", "h2"),
          p("Il fait la même chose que le raccourci, <b>dans les deux sens</b>. Le panneau ne voit pas ce que vous faites dans "
            "Inkscape : c'est pourquoi le bouton ne dit jamais « à jour ».") ,
          *puces("<b>Orange « Synchroniser (3) »</b> : trois réglages attendent d'être envoyés à Inkscape.",
                 "<b>Bleu</b>, avec « De retour d'Inkscape ? » : vous êtes passé par Inkscape, synchronisez pour reprendre vos changements.",
                 "<b>Discret</b> sinon. <b>Annuler</b> (à côté) oublie ce qui n'est pas encore envoyé."),
          p("La sélection d'Inkscape", "h2"),
          p("Si des objets sont sélectionnés dans Inkscape au moment du " + CMD + ", le panneau ne montre qu'eux : un bandeau "
            "le dit (« Sélection d'Inkscape : 2 objets sur 40 ») avec le bouton <b>Tout le dessin</b>. L'aperçu et l'export "
            "se limitent alors à ces objets."),
          encadre("<b>Avant de fermer Inkscape : " + CMD + " puis Cmd S.</b> Vous avez oublié ? Les réglages ne sont pas perdus : "
                  "le panneau les garde, même fermé, et les rattache à leur dessin au prochain " + CMD + ".", "SAUVEGARDE", SABLE, ROSE_FONCE),
          capture("etroit", 34, "En fenêtre étroite, le panneau se range à droite d'Inkscape ; élargissez-la pour avoir "
                                "l'aperçu à côté des réglages."),
          PageBreak()]

    # ---- 4. objets : la liste
    c += [Chapitre(4, "Onglet Objets : la liste", "Calques et objets, dans l'ordre où ils seront brodés"),
          capture("objets", 118, "L'aperçu des points à gauche ; les calques, les objets et la fiche de l'objet choisi à droite."),
          p("Choisir", "h2"),
          *puces(touche("clic") + " un objet · " + touche("Cmd") + " " + touche("clic") + " en ajouter ou en retirer · "
                 + touche("Maj") + " " + touche("clic") + " toute une suite · un clic dans l'aperçu choisit l'objet sous la souris.",
                 "Le bouton <b>Tout</b> (au survol d'un calque) choisit tous ses objets. <b>Tout désélectionner</b> (en-tête), "
                 + touche("Échap") + " ou un clic dans le vide de l'aperçu ne choisissent plus rien.",
                 "<b>Choisir les semblables</b> (fiche de l'objet) : tous les objets du même point, ou du même point et des "
                 "mêmes réglages, d'un coup.",
                 "Plusieurs objets choisis : les réglages s'appliquent à tous ; <b>≠</b> signale une valeur différente."),
          p("Ranger", "h2"),
          *puces("Un clic sur la ligne d'un calque le <b>replie</b> ou le déplie ; replié, il affiche « 1 choisi » s'il contient la sélection.",
                 "La <b>punaise</b> garde la liste en haut pendant que les réglages défilent ; la poignée sous la liste règle sa hauteur.",
                 "L'<b>œil</b> masque un objet ou un calque : il n'est plus brodé, mais reste dans la liste."),
          p("L'ordre de broderie", "h2"),
          p("Ink/Stitch brode <b>du haut vers le bas</b> de la liste. Pour changer l'ordre, <b>glissez</b> un objet (ou toute la "
            "sélection : elle suit, dans son ordre) :"),
          *puces("sur un objet : juste avant ou juste après lui ;",
                 "au milieu de l'en-tête d'un calque : dedans, au début ;",
                 "sur le <b>bord haut</b> de l'en-tête d'un calque, quand « Nouveau calque ici » apparaît : <b>entre deux calques</b>. "
                 "Les objets vont dans un calque à eux, nommé d'après leur calque (« Citrouille · avant Etoile 3 »). "
                 "Leur place à l'écran ne change pas, seul l'ordre change."),
          PageBreak()]

    # ---- 5. aperçu
    c += [Chapitre(5, "L'aperçu des points", "Voir ce que la machine va broder"),
          *puces("Molette : zoom · glisser ou bouton du milieu : déplacer · double-clic ou <b>Tout voir</b> : recentrer sur ce qui "
                 "est brodé et affiché.",
                 "Boutons de la barre : <b>grenouille</b> (sauts), <b>ciseaux</b> (coupes, arrêts, changements de couleur), "
                 "<b>carreaux</b> (densité), <b>aiguille</b> (pénétrations).",
                 "<b>Règle</b> : tirez un trait, la distance s'affiche en mm ; elle s'accroche aux piqûres d'aiguille proches."),
          p("La carte de densité", "h2"),
          capture("densite", 140, "Carte de densité : rouge = trop serré (risque de casse), jaune = limite, vert = correct. "
                                  "La légende en bas règle les seuils."),
          p("Les seuils sont ceux d'Ink/Stitch (6 points dans 0,5 mm pour le rouge, 3 pour le jaune). Modifiez-les dans la "
            "légende ; ils sont retenus, et ↺ revient à ceux d'Ink/Stitch. Rouge sur un remplissage : espacez les rangs ou "
            "réduisez la sous-couche. Quelques points rouges aux bords sont normaux."),
          PageBreak()]

    # ---- 6. régler
    c += [Chapitre(6, "Régler un objet", "La fiche de l'objet choisi"),
          *puces("<b>Type de point</b> en tuiles : Tatami, Contour, Spirale, Méandre, Guidé, Dégradé, Point de croix, Tartan "
                 "pour un remplissage ; Point droit, Triple, Ripple, Zigzag, Manuel, Satin pour un trait ; Satin, Point E, Point S, "
                 "Zigzag pour une colonne satin.",
                 "<b>Paramètres essentiels</b> en curseurs ; tous les autres dans <b>Plus de réglages</b>, rangés par thème.",
                 "Le petit <b>i</b> à côté de chaque réglage : la bonne pratique, et le lien vers la page de la documentation d'Ink/Stitch.",
                 "Un réglage vide dans Ink/Stitch (découpe des longs points…) est grisé « non » ou « auto » : <b>Activer</b> l'applique.",
                 "<b>Copier les réglages</b>, puis <b>Coller</b> sur une autre forme, ou sur toutes celles du même type. "
                 "<b>Mes réglages favoris</b> : un jeu de réglages gardé sous un nom, pour tous vos dessins."),
          capture("satin", 150, "Fiche d'un satin : Ink/Stitch · Auto · Main sous chaque réglage calculé, et le conseil ouvert (i)."),
          p("Ink/Stitch · Auto · Main", "h2"),
          p("Sous les réglages qui dépendent du tissu, un petit sélecteur dit d'où vient la valeur. Par défaut, tout réglage "
            "que vous n'avez pas touché est en <b>Auto</b> (profil « coton, à déchirer, fil 40 » tant que vous n'en choisissez pas un autre) :"),
          *puces("<b>Ink/Stitch</b> : la valeur par défaut d'Ink/Stitch (rien n'est écrit dans le fichier) ;",
                 "<b>Auto</b> : calculée d'après le profil du dessin (tissu, stabilisateur, fil) et la forme (largeur d'un satin). "
                 "Elle est recalculée si le profil change ;",
                 "<b>Main</b> : votre valeur. Il suffit de bouger le curseur ; elle ne change plus d'elle-même. Un réglage remis "
                 "sur Ink/Stitch le reste aussi."),
          PageBreak(),
          p("La couleur", "h2"),
          capture("couleurs", 150, "Couleurs déjà dans le dessin : un clic donne exactement la même couleur."),
          *puces("Le rond de couleur ouvre le sélecteur du système.",
                 "<b>Couleurs déjà dans le dessin</b> : une pastille par couleur utilisée, tous calques confondus. Un clic donne "
                 "exactement la même couleur à l'objet ou aux objets choisis ; au survol, les objets qui l'utilisent et le fil "
                 "de la bobine choisie."),
          PageBreak()]

    # ---- 7. remplissages
    c += [Chapitre(7, "Remplissages", "Tatami, contour, méandre, guidé…"),
          *puces("<b>Densité</b> (écart entre les rangs) : 0,4 mm en fil 40 ; plus serré, le tissu devient raide.",
                 "<b>Angle</b> : changez-le entre deux zones voisines (45° et 135°) pour qu'elles se distinguent.",
                 "<b>Sous-couche</b> : indispensable sur maille et grandes zones, inutile sur les petits éléments.",
                 "<b>Guidé</b> : les rangs suivent une courbe. Dessinez-la dans Inkscape (Plume), puis dans le panneau : tuile "
                 "<b>Guidé</b>, et dans le bloc <b>Ligne guide</b>, choisissez la courbe. Elle n'est pas brodée, elle oriente les rangs."),
          p("Départ et fin de l'aiguille", "h2"),
          capture("positions", 150, "Départ (▶ vert) et fin (■ rouge) placés d'un clic dans l'aperçu."),
          p("Facultatif : sans repère, Ink/Stitch part au plus près de l'aiguille. <b>Placer</b>, puis un clic dans l'aperçu près "
            "du bord de la forme : l'aiguille y commence (ou y finit). Utile pour finir près de l'objet suivant et raccourcir le "
            "saut. <b>Déplacer</b> pour changer de place, <b>Automatique</b> pour laisser Ink/Stitch choisir. Le repère est "
            "un symbole relié à la forme dans Inkscape."),
          p("Outils", "h2"),
          *puces("<b>Remplissage en trait</b>, <b>Assise de points couchants</b>, <b>Briser des objets de remplissage</b> ; "
                 "<b>Plus d'outils</b> : remplissage en satin, dégradé, tartan, assistant point de croix.",
                 "<b>Figer en points</b> : les vrais points de l'aiguille deviennent un tracé à retoucher nœud par nœud (dentelle FSL)."),
          PageBreak()]

    # ---- 8. satin
    c += [Chapitre(8, "Colonnes satin", "Le point brillant des bordures et des lettres"),
          p("Trois façons d'en faire une", "h2"),
          *puces("<b>La plus simple</b> : un trait (outil Plume) avec l'épaisseur voulue, puis la tuile <b>Satin</b>.",
                 "<b>Comme dans Ink/Stitch</b> : deux <b>rails</b> et des <b>traverses</b> (elles donnent le sens des points) ; "
                 "la rubrique <b>Rails et traverses</b> les assemble.",
                 "<b>Depuis une forme remplie</b> : dessinez des traverses qui la coupent d'un bord à l'autre, choisissez la forme et "
                 "ses traverses (" + touche("Cmd") + " " + touche("clic") + "), puis <b>Remplissage en satin</b>."),
          p("Les réglages qui comptent", "h2"),
          tableau([["Réglage", "Bonne pratique"],
                   ["Largeur", "1,5 à 7 mm. Au-delà de 8 mm : découpe des longs points (7 mm) ou remplissage."],
                   ["Densité", "0,4 mm en fil 40, 0,35 en fil 60, 0,45 en fil 30."],
                   ["Compensation", "≈ 0,15 mm pour 2 mm de large, 0,25 à 0,3 mm de 5 à 7 mm ; plus sur maille. "
                                    "En % de la largeur pour un satin large ou de largeur variable."],
                   ["Sous-couches", "Centre sous 2 mm ; contour de 2 à 4 mm ; contour + zigzag au-delà ou sur maille."],
                   ["Points courts", "Dans les courbes serrées, un point sur deux raccourci côté intérieur (15 %, 0,25 mm par défaut)."]],
                  [34, 136]),
          Spacer(1, 4 * mm),
          astuce("« Vérifier avant d'exporter » signale un satin de plus de 8 mm et propose « Découper à 7 mm »."),
          PageBreak()]

    # ---- 9. appliqué
    c += [Chapitre(9, "Appliqué", "Un tissu cousu sur le support"),
          capture("applique", 150, "Le bloc Appliqué d'une forme remplie, avec son conseil."),
          p("Ink/Stitch n'a pas d'outil d'appliqué, seulement une méthode à suivre à la main. Dans la fiche d'une forme remplie, "
            "le bloc <b>Appliqué</b> la fait d'un clic : choisissez la largeur de la bordure (3 à 4 mm en général), puis "
            "<b>Créer l'appliqué</b>. La forme d'origine est gardée, masquée."),
          etapes("<b>Placement</b> : une ligne brodée sur le support. La machine s'arrête : posez le tissu d'appliqué dessus.",
                 "<b>Fixation</b> : le tissu est cousu. La machine s'arrête : découpez le surplus au ras (ciseaux à appliqué).",
                 "<b>Bordure satin</b> : elle recouvre le bord coupé."),
          Spacer(1, 3 * mm),
          p("Tutoriel d'Ink/Stitch : " + lien("https://inkstitch.org/fr/tutorials/applique/")),
          PageBreak()]

    # ---- 10. texte
    c += [Chapitre(10, "Texte brodé", "140 polices faites pour la broderie"),
          capture("texte", 95, "+ Texte : le texte, la police, la taille, la forme, et l'aperçu des points."),
          *puces("<b>+ Texte</b> : le texte, la police (avec son aperçu), la taille et l'alignement. L'aperçu des points s'affiche "
                 "quelques secondes après chaque changement, avec la taille en mm.",
                 "<b>Forme</b> : Droit, <b>Arc vers le haut</b>, <b>Arc vers le bas</b> (100 % = presque un cercle) ou <b>Sur une courbe</b> "
                 "dessinée dans Inkscape.",
                 "<b>Réglages des lettres</b> (texte choisi dans la liste) : densité, sous-couche… pour tout le texte ou une seule "
                 "lettre ; préréglages selon le tissu. Ils sont gardés quand on modifie le texte.",
                 "Alertes : lettres trop petites (moins de 5 mm), satin trop dense sur de petites lettres, taille hors de la plage de la police."),
          astuce("Une police de votre ordinateur ? Tapez le texte dans Inkscape puis <i>Chemin › Objet en chemin</i> : les lettres "
                 "deviennent des formes, à régler en remplissage ou en satin."),
          PageBreak()]

    # ---- 11. simulation
    c += [Chapitre(11, "Onglet Simulation", "Regarder la machine broder, dans son cadre"),
          capture("simulation", 150, "La broderie point par point, dans le cadre de la brodeuse, avec le bâti."),
          *puces("<b>Animation</b> : la machine brode point par point. <b>Point suivant / précédent</b> : un clic = un point ; "
                 "bouton maintenu = les points défilent, de plus en plus vite, jusqu'au relâchement.",
                 "<b>Vue en points</b> (chaque piqûre), <b>Tout voir</b>, <b>Suivre l'aiguille</b>, <b>Règle</b>. <b>Réaliste</b> : le fil sur le tissu.",
                 "<b>Cadre</b> : choisissez le vôtre (ou ajoutez-le) ; le panneau dit si le motif tient. <b>Position du motif</b> : "
                 "centré (comme la machine) ou selon sa place sur la feuille.",
                 "<b>Bâti</b> : un faufilage autour du motif, brodé en premier, dans la couleur du premier objet (pas de "
                 "changement de fil). Curseurs : écart, longueur de point, arrondi."),
          tableau([["Touche (Animation)", "Effet"],
                   [touche("P") + " " + touche("R"), "lecture / pause · recommencer"],
                   [touche("flèche haut") + " " + touche("flèche bas"), "plus rapide / plus lent"],
                   [touche("+") + " " + touche("−") + " · " + touche("page haut") + " " + touche("page bas"), "un point · une commande (saut, coupe, couleur)"],
                   [touche("O"), "pénétrations de l'aiguille"]], [70, 100]),
          PageBreak()]

    # ---- 12. export
    c += [Chapitre(12, "Onglet Export", "Préparer, vérifier, exporter"),
          capture("export", 140, "Préparer la broderie : le profil (tissu, stabilisateur, fil), l'ordre, les coupes, les liaisons."),
          p("Préparer la broderie", "h2"),
          *puces("<b>Profil de broderie</b> : tissu, stabilisateur, fil, enregistrés dans le dessin, avec le conseil "
                 "(stabilisateur, film soluble). <b>Tout le dessin en auto</b> calcule les réglages de chaque objet.",
                 "<b>Regrouper les couleurs</b> : moins de changements de fil (le gain est affiché avant).",
                 "<b>Couper</b> après les sauts plus longs que N mm ; <b>Relier</b> les sauts courts entre formes de même couleur "
                 "par un point droit (il reste visible s'il n'est pas recouvert)."),
          PageBreak(),
          p("Vérifier avant d'exporter", "h2"),
          capture("verifier", 140, "Chaque point à regarder, avec Montrer et, quand c'est possible, Corriger."),
          p("Le dépistage d'Ink/Stitch traduit (satin mal formé, bordure qui se croise…), les sauts longs sans coupe, les "
            "zones trop denses, les satins trop larges, les objets minuscules, le motif hors du cadre. <b>Montrer</b> le "
            "désigne, <b>Corriger</b> applique la solution."),
          p("Exporter", "h2"),
          *puces("<b>Fichier de broderie</b> : le format de votre machine (.pes Brother, .dst Tajima, .jef Janome, .exp Bernina, "
                 ".vp3 Husqvarna / Pfaff…), enregistré dans Téléchargements.",
                 "<b>Bobines</b> : la marque de vos fils (75 nuanciers) ; pour chaque couleur, la bobine la plus proche ; "
                 "<b>Prendre les couleurs exactes des fils</b>.",
                 "<b>Fiche machine</b> en français : aperçu, fils dans l'ordre, longueur de fil, cadre, durée, à imprimer ou en PDF.",
                 "<b>Ouvrir un fichier machine</b> (.pes, .dst…) : converti en dessin, enregistré à côté, sans rien écraser.",
                 "<b>Toutes les commandes Ink/Stitch</b> : la liste complète, avec recherche."),
          PageBreak()]

    # ---- 13. réglages auto expliqués
    c += [Chapitre(13, "Les réglages automatiques", "Comment le panneau calcule, et d'où viennent les règles"),
          p("Il n'existe pas de table officielle chiffrée : Wilcom, Hatch et Ink/Stitch demandent tous un essai sur le tissu. "
            "Le panneau suit les règles sur lesquelles les sources s'accordent ; ce sont des <b>points de départ</b>.", "intro"),
          tableau([["Réglage", "Règle", "Source"],
                   ["Sous-couches satin", "centre 1 à 2 mm · contour 2 à 4 mm · contour + zigzag au-delà ; renforcées sur maille et polaire",
                    "Ink/Stitch (tutoriel sous-couches), Wilcom"],
                   ["Compensation satin", "≈ 0,15 mm à 2 mm de large, jusqu'à 0,3 mm vers 7 mm ; × tissu (maille plus, toile et soie moins)",
                    "guides de numérisation, Wilcom"],
                   ["Densité", "satin 0,4 mm en fil 40 (0,35 en 60, 0,45 en 30) ; remplissage 0,4 mm ; un peu moins dense sur tissus épais et mailles",
                    "Wilcom, Hatch"],
                   ["Découpe satin", "7 mm au-delà de 8 mm de large", "pratique courante"],
                   ["Stabilisateur", "à découper : mailles · à déchirer : tissés · film soluble dessus : éponge, polaire, piqué",
                    "Hatch, Threads Magazine"]], [33, 92, 45]),
          Spacer(1, 4 * mm),
          encadre("Si le stabilisateur choisi est plus faible que celui conseillé pour le tissu, le panneau augmente la "
                  "compensation de 20 % et le signale. Cette valeur est une estimation prudente : les sources disent seulement "
                  "que le tissu bouge davantage.", "À SAVOIR", SABLE, ROSE_FONCE),
          p("Faites toujours un essai sur une chute du même tissu, avec le même stabilisateur, puis ajustez à la main : la "
            "valeur passe « Main » et ne bougera plus."),
          PageBreak()]

    # ---- 14. astuces
    c += [Chapitre(14, "Astuces de réglages", "Des valeurs de départ, à affiner par un essai"),
          tableau([["Tissu", "Densité", "Sous-couche", "Compensation", "Stabilisateur"],
                   ["Coton, lin", "0,4 mm", "oui", "0,15 – 0,3 mm", "à déchirer"],
                   ["Tissu fin, soie", "0,45 mm", "légère", "≈ 0,1 mm", "soluble ou fin"],
                   ["Jersey, tee-shirt", "0,4 mm", "toujours", "≈ 0,4 mm", "à découper"],
                   ["Piqué (polo)", "0,4 mm", "renforcée", "0,2 – 0,35 mm", "à découper + film dessus"],
                   ["Éponge, polaire", "0,45 mm", "renforcée", "≈ 0,3 mm", "à découper + film dessus"],
                   ["Toile, jean", "0,45 mm", "oui", "≈ 0,1 – 0,2 mm", "à déchirer, épais"],
                   ["Cuir, simili", "0,45 mm", "légère", "≈ 0,1 mm", "à déchirer"]], [36, 24, 28, 34, 48]),
          Spacer(1, 6 * mm),
          cartes(("Colonnes satin", ["Largeur : <b>1,5 à 7 mm</b>.", "Densité : <b>0,35 à 0,45 mm</b>.",
                                     "Sous-couche : centre, contour, contour + zigzag selon la largeur."]),
                 ("Remplissages", ["Changez l'<b>angle</b> entre zones voisines.", "Longueur de point : <b>3 à 4 mm</b>.",
                                   "Une sous-couche pour les grandes zones."]),
                 ("Traits et textes", ["Point droit : <b>2 à 2,5 mm</b> ; 1,5 mm dans les courbes.", "<b>Triple</b> pour un trait visible.",
                                       "Texte : au moins <b>5 mm</b> de haut."]),
                 ("Organisation", ["Le fond d'abord, les détails ensuite.", "Regroupez les couleurs.",
                                   "Coupez après les sauts de plus de 5 mm environ."])),
          PageBreak()]

    # ---- 15. dépannage
    c += [Chapitre(15, "En cas de souci"),
          tableau([["Ce que je vois", "Que faire"],
                   [CMD + " ne fait rien", "Quittez et relancez Inkscape. Le menu Extensions › Broderie › Panneau de broderie fait la même chose."],
                   ["« Panneau arrêté »", "Appuyez sur " + CMD + " : il redémarre, sans perdre les modifications en attente."],
                   ["La liste ne montre que quelques objets", "Des objets étaient sélectionnés dans Inkscape : bandeau « Tout le dessin »."],
                   ["Bandeau « ancienne version d'Ink/Stitch »", "« Mettre à jour avec Ink/Stitch », ou « Ce dessin est récent »."],
                   ["Une fenêtre « Ink/Stitch » s'ouvre", "Certaines commandes ont leur propre fenêtre : terminez-la, le résultat arrive dans le panneau."],
                   ["Inkscape semble ne pas démarrer", "Sa fenêtre est peut-être sur un autre bureau : " + touche("Ctrl") + " "
                    + touche("flèche haut") + " (Mission Control)."],
                   ["Le bouton Synchroniser ne fait rien", "Autorisez Inkscape dans Réglages Système › Confidentialité et sécurité › Accessibilité."]],
                  [62, 108]),
          Spacer(1, 8 * mm),
          p("Versions", "h2"),
          p("Le numéro de version est affiché en haut du panneau ; le détail des changements est dans <b>CHANGELOG.md</b>. "
            "Testé avec Inkscape 1.4.2 et Ink/Stitch 3.3.0 sur macOS. Licence GPL v3, comme Ink/Stitch."),
          p("Documentation d'Ink/Stitch : " + lien(DOC, "inkstitch.org/fr/docs") + " · Le projet : "
            + lien("https://github.com/ermeen/broderie-inkscape", "github.com/ermeen/broderie-inkscape"), "legende")]
    d.build(c)
    return sortie


if __name__ == "__main__":
    print(guide_rapide())
    print(guide_complet())
