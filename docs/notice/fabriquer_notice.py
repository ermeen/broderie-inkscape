"""Fabrique la notice PDF du Panneau de broderie (reportlab).

Utilisation : python3 fabriquer_notice.py   →  docs/Notice-Broderie-<version>.pdf
Les captures d'écran sont dans docs/notice/images (prises avec Chrome sans fenêtre sur un dessin d'essai).
"""
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.normpath(os.path.join(ICI, "..", ".."))
with open(os.path.join(RACINE, "VERSION"), encoding="utf-8") as f:
    VERSION = f.read().strip()
SORTIE = os.path.join(RACINE, "docs", "Notice-Broderie-%s.pdf" % VERSION)

POLICES = "/System/Library/Fonts/Supplemental/"
pdfmetrics.registerFont(TTFont("Texte", POLICES + "Arial.ttf"))
pdfmetrics.registerFont(TTFont("Texte-Gras", POLICES + "Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("Texte-Italique", POLICES + "Arial Italic.ttf"))
pdfmetrics.registerFontFamily("Texte", normal="Texte", bold="Texte-Gras", italic="Texte-Italique")

ACCENT = colors.HexColor("#2f6fdb")
ENCRE = colors.HexColor("#1d1d1f")
GRIS = colors.HexColor("#6e6e73")
FOND = colors.HexColor("#f2f5fa")

S = {
    "titre": ParagraphStyle("titre", fontName="Texte-Gras", fontSize=30, leading=36, textColor=ENCRE, alignment=TA_CENTER),
    "soustitre": ParagraphStyle("soustitre", fontName="Texte", fontSize=13, leading=18, textColor=GRIS, alignment=TA_CENTER),
    "h1": ParagraphStyle("h1", fontName="Texte-Gras", fontSize=18, leading=23, textColor=ACCENT, spaceBefore=4, spaceAfter=8),
    "h2": ParagraphStyle("h2", fontName="Texte-Gras", fontSize=12.5, leading=16, textColor=ENCRE, spaceBefore=8, spaceAfter=4),
    "p": ParagraphStyle("p", fontName="Texte", fontSize=10.5, leading=15, textColor=ENCRE, spaceAfter=5),
    "liste": ParagraphStyle("liste", fontName="Texte", fontSize=10.5, leading=15, textColor=ENCRE, leftIndent=12,
                            bulletIndent=2, spaceAfter=2),
    "legende": ParagraphStyle("legende", fontName="Texte-Italique", fontSize=9, leading=12, textColor=GRIS,
                              alignment=TA_CENTER, spaceAfter=8),
    "cellule": ParagraphStyle("cellule", fontName="Texte", fontSize=9.5, leading=13, textColor=ENCRE),
    "cellule_g": ParagraphStyle("cellule_g", fontName="Texte-Gras", fontSize=9.5, leading=13, textColor=ENCRE),
    "encadre": ParagraphStyle("encadre", fontName="Texte", fontSize=10.5, leading=15, textColor=ENCRE),
}


def p(t, st="p"):
    return Paragraph(t, S[st])


def puces(*items):
    return [Paragraph(t, S["liste"], bulletText="•") for t in items]


def image(nom, largeur=170, legende=None):
    f = os.path.join(ICI, "images", nom + ".png")
    from reportlab.lib.utils import ImageReader
    w, h = ImageReader(f).getSize()
    el = [Image(f, width=largeur * mm, height=largeur * mm * h / w)]
    if legende:
        el.append(p(legende, "legende"))
    return KeepTogether(el)


def tableau(lignes, largeurs, entete=True):
    data = [[Paragraph(str(c), S["cellule_g" if (entete and i == 0) else "cellule"]) for c in l] for i, l in enumerate(lignes)]
    t = Table(data, colWidths=[w * mm for w in largeurs], repeatRows=1 if entete else 0)
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d5dbe5")),
             ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
             ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    if entete:
        style.append(("BACKGROUND", (0, 0), (-1, 0), FOND))
    t.setStyle(TableStyle(style))
    return t


def encadre(texte, couleur="#eaf1fd"):
    t = Table([[Paragraph(texte, S["encadre"])]], colWidths=[170 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(couleur)),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return t


def pied(canvas, doc):
    canvas.saveState()
    canvas.setFont("Texte", 8.5)
    canvas.setFillColor(GRIS)
    canvas.drawString(20 * mm, 12 * mm, "Panneau de broderie pour Inkscape · version %s" % VERSION)
    canvas.drawRightString(190 * mm, 12 * mm, "page %d" % doc.page)
    canvas.restoreState()


R = "<b>Cmd+Option+B</b>"
contenu = []
# ---------------------------------------------------------------- couverture
contenu += [Spacer(1, 30 * mm), p("Panneau de broderie", "titre"), Spacer(1, 4 * mm),
            p("pour Inkscape et Ink/Stitch — notice d'utilisation", "soustitre"),
            p("version %s" % VERSION, "soustitre"), Spacer(1, 12 * mm),
            image("objets", 165), Spacer(1, 6 * mm),
            encadre("<b>En une phrase :</b> vous dessinez dans <b>Inkscape</b>, vous réglez la broderie dans le "
                    "<b>panneau</b>, et <b>Ink/Stitch</b> calcule les points. Un seul geste relie les deux : " + R + "."),
            PageBreak()]

# ---------------------------------------------------------------- principe
contenu += [p("1. Qui fait quoi ?", "h1"),
            tableau([["Je veux…", "Où ?"],
                     ["Dessiner une forme, une courbe, une colonne satin", "Inkscape"],
                     ["Déplacer, tourner, agrandir, supprimer (formes et textes)", "Inkscape"],
                     ["Choisir le type de point, la densité, l'angle, les sous-couches", "Panneau › Objets"],
                     ["Créer un texte brodé, le courber sur un tracé", "Panneau › Objets › + Texte"],
                     ["Voir les points, les sauts, la simulation", "Panneau › Aperçu et Points"],
                     ["Choisir le cadre, centrer le motif, exporter pour la machine", "Panneau › Export"],
                     ["Enregistrer le travail", "Inkscape (Cmd+S)"]], [115, 55]),
            Spacer(1, 6 * mm),
            p("2. Installer (une seule fois)", "h1"),
            *puces("Il faut <b>Inkscape 1.4</b> et <b>Ink/Stitch 3</b> déjà installés.",
                   "Double-cliquez sur <b>installer.command</b>. Si macOS refuse : clic droit › Ouvrir › Ouvrir.",
                   "Quittez Inkscape (Cmd+Q) puis relancez-le : le raccourci " + R + " est alors actif.",
                   "Facultatif : pour le bouton <b>Synchroniser avec Inkscape</b> du panneau, autorisez Inkscape dans "
                   "Réglages Système › Confidentialité et sécurité › <b>Accessibilité</b>."),
            p("Pour retirer le panneau : <b>desinstaller.command</b>. Ink/Stitch n'est jamais modifié."),
            Spacer(1, 4 * mm),
            p("3. Le geste à retenir", "h1"),
            encadre("<b>" + R + " dans Inkscape</b> (ou Extensions › Broderie › Panneau de broderie)<br/>"
                    "• après avoir dessiné ou sélectionné : le panneau s'ouvre ou se met à jour avec votre dessin ;<br/>"
                    "• après avoir changé des réglages dans le panneau : ils sont appliqués au dessin "
                    "(Cmd+Z dans Inkscape les annule).<br/>"
                    "Le bas du panneau indique combien de modifications attendent d'être envoyées."),
            Spacer(1, 3 * mm),
            encadre("<b>Avant de fermer Inkscape : " + R + " puis Cmd+S.</b> Les réglages de broderie sont enregistrés "
                    "<b>dans votre fichier .svg</b>, exactement comme Ink/Stitch les enregistre : le fichier reste "
                    "utilisable avec les menus Ink/Stitch habituels.", "#fdf3e1"),
            PageBreak()]

# ---------------------------------------------------------------- objets
contenu += [p("4. Onglet Objets : régler la broderie", "h1"),
            image("objets", 140, "L'aperçu à gauche (fenêtre large) ; la liste des calques et objets et les réglages à droite."),
            p("Choisir des objets", "h2"),
            *puces("<b>Clic</b> : un objet. <b>Cmd-clic</b> : en ajouter ou en retirer. <b>Maj-clic</b> : toute une suite.",
                   "<b>Clic sur le nom d'un calque</b> : tous ses objets.",
                   "Plusieurs objets choisis : les réglages s'appliquent à tous. Le signe <b>≠</b> indique des valeurs "
                   "différentes ; en changer une la rend identique partout.",
                   "Les objets choisis sont entourés de pointillés bleus dans l'aperçu."),
            p("Régler", "h2"),
            *puces("<b>Type de point</b> en tuiles : Tatami, Contour, Spirale, Méandre… pour un remplissage ; "
                   "Point droit, Triple, Ripple, Zigzag, Satin pour un trait.",
                   "<b>Paramètres</b> essentiels en curseurs : densité, angle, longueur de point, compensation.",
                   "<b>Sous-couche</b> en tuiles ; <b>Couper le fil</b> et <b>Arrêter la machine</b> après l'objet.",
                   "<b>Plus de réglages</b> : tous les autres réglages d'Ink/Stitch, rangés par thèmes (fermés).",
                   "<b>Copier les réglages</b> puis <b>Coller</b> sur une autre forme du même type, ou sur toutes.",
                   "La petite flèche circulaire à côté d'un réglage le remet à sa valeur par défaut."),
            p("L'aperçu", "h2"),
            *puces("<b>Points</b> : les points d'aiguille, les <b>sauts</b> (pointillés et grenouille), les coupes, "
                   "les arrêts et les changements de couleur (cases à cocher).",
                   "<b>Réaliste</b> : rendu photo du fil sur le tissu ; choisissez la couleur du <b>tissu</b>.",
                   "Molette : zoom · glisser : déplacer · double-clic : tout voir. La barre sous l'aperçu change sa hauteur."),
            PageBreak()]

# ---------------------------------------------------------------- satin et texte
contenu += [p("5. Colonnes satin", "h1"),
            image("satin", 150, "Une colonne satin choisie : type Satin, Point E, Point S ou Zigzag, densité, sous-couches."),
            p("Deux façons de faire :", "p"),
            *puces("<b>La plus simple</b> : dans Inkscape, tracez un trait (outil Plume) avec l'<b>épaisseur</b> voulue "
                   "— elle devient la largeur du satin. Dans le panneau, choisissez la tuile <b>Satin</b>.",
                   "<b>Comme dans Ink/Stitch</b> : dessinez deux <b>rails</b> et des <b>traverses</b> (qui donnent le sens des "
                   "points). Dans le panneau, choisissez un rail : la rubrique <b>Rails et traverses</b> propose de les "
                   "<b>assembler</b> en une seule colonne (Ink/Stitch l'exige)."),
            Spacer(1, 3 * mm),
            p("6. Texte brodé", "h1"),
            *puces("<b>+ Texte</b> (en haut de la liste) : tapez votre texte, choisissez une des <b>140 polices</b> "
                   "de broderie (aperçu de chacune), la taille et l'alignement, puis <b>Ajouter au dessin</b>.",
                   "« Espacements, coupes et couleurs » : espace entre lettres et mots, interligne, coupe du fil.",
                   "<b>Texte courbé</b> : dessinez une courbe dans Inkscape (" + R + "), choisissez le texte dans la "
                   "liste, puis la courbe à suivre.",
                   "Le texte se <b>déplace</b> et se <b>tourne</b> dans Inkscape, comme une forme.",
                   "Une police de votre Mac : tapez le texte dans Inkscape, puis <i>Chemin › Objet en chemin</i> ; les "
                   "lettres deviennent des formes à régler en remplissage ou en satin."),
            PageBreak()]

# ---------------------------------------------------------------- points
contenu += [p("7. Onglet Points : la simulation", "h1"),
            image("points", 165, "La machine brode le motif ; ici avec les sauts (grenouilles), les changements de couleur "
                                 "(bobines) et la mire sur l'aiguille."),
            tableau([["Bouton / touche", "Effet"],
                     ["P", "lecture / pause"], ["R", "recommencer"], ["Flèches haut / bas", "plus rapide / plus lent"],
                     ["Flèches gauche / droite", "sens de l'animation"], ["+ / −", "un point en avant / en arrière"],
                     ["Page haut / bas", "commande suivante / précédente (saut, coupe, couleur)"],
                     ["O", "afficher les pénétrations de l'aiguille"],
                     ["Molette, glisser, double-clic", "zoom, déplacer, tout voir"]], [60, 110]),
            Spacer(1, 3 * mm),
            p("Les boutons du bas affichent ou masquent : pénétrations, sauts, coupes, arrêts, changements de couleur, "
              "mire, page (cadre), informations (dimensions, nombre de points, de sauts, de coupes…). La roue dentée "
              "ouvre les préférences (épaisseur du fil, taille des pénétrations, mire)."),
            PageBreak()]

# ---------------------------------------------------------------- aperçu / export
contenu += [p("8. Onglet Aperçu", "h1"),
            image("apercu", 118, "Rendu réaliste sur tissu, avec le nombre de points, la durée estimée, la taille et les fils."),
            p("9. Onglet Export : cadre et fichier machine", "h1"),
            image("export", 118),
            *puces("<b>Fichier de broderie</b> : le format de votre machine (.pes Brother, .dst Tajima, .jef Janome, "
                   ".exp Bernina, .vp3 Husqvarna/Pfaff…). Le fichier arrive dans Téléchargements.",
                   "<b>Cadre de la brodeuse</b> : choisissez votre cadre ; le panneau vérifie que le motif y tient. "
                   "<b>Ajouter un cadre</b> (nom, largeur, hauteur) ou <b>Supprimer</b> ceux que vous n'avez pas.",
                   "<b>Centrer le motif dans le cadre</b> : le motif est centré et la <b>page d'Inkscape prend la taille "
                   "du cadre</b> (son bord montre le cadre). Puis " + R + "."),
            PageBreak()]

# ---------------------------------------------------------------- astuces
contenu += [p("10. Astuces de réglages", "h1"),
            p("Valeurs de départ courantes en broderie machine : faites toujours un <b>essai sur une chute du même tissu</b>, "
              "avec le même stabilisateur."),
            p("Selon le tissu", "h2"),
            tableau([["Tissu", "Densité remplissage", "Sous-couche", "Compensation", "Stabilisateur"],
                     ["Coton, lin, toile (tissé)", "0,40 mm", "oui", "0,2 mm", "à déchirer"],
                     ["Tissu fin, soie, voile", "0,45 – 0,50 mm (plus léger)", "légère", "0,1 mm", "soluble ou fin à déchirer"],
                     ["Jersey, tee-shirt (maille)", "0,40 – 0,45 mm", "oui, toujours", "0,3 – 0,4 mm", "à découper"],
                     ["Sweat, polaire, éponge", "0,35 – 0,40 mm", "oui", "0,3 mm", "à découper + film soluble dessus"],
                     ["Jean, toile épaisse", "0,35 – 0,40 mm", "oui", "0,2 mm", "à déchirer, épais"],
                     ["Cuir, simili", "0,45 – 0,50 mm", "légère", "0,1 mm", "à déchirer ; points pas trop serrés"]],
                    [36, 36, 26, 28, 44]),
            Spacer(1, 3 * mm),
            p("Colonnes satin", "h2"),
            *puces("Largeur conseillée : <b>1,5 à 7 mm</b>. Plus étroit, le satin se perd ; plus large, les points sont trop "
                   "longs et accrochent : utilisez un remplissage, ou « Découpe des longs points ».",
                   "Densité : <b>0,35 à 0,45 mm</b>.",
                   "Sous-couche : <b>Centre</b> sous 2 mm de large ; <b>Contour</b> de 2 à 5 mm ; <b>Contour + Zigzag</b> "
                   "au-delà de 5 mm.",
                   "Compensation : <b>0,2 à 0,4 mm</b> — le fil tire et rétrécit le satin, surtout sur la maille."),
            p("Remplissages", "h2"),
            *puces("Changez l'<b>angle</b> entre deux zones voisines (par ex. 45° et 135°) : elles se distinguent mieux.",
                   "Longueur de point : 3 à 4 mm ; les grandes zones gagnent à une sous-couche.",
                   "Méandre, Spirale, Contour : des effets décoratifs ; vérifiez-les dans l'aperçu Réaliste."),
            p("Traits et textes", "h2"),
            *puces("Point droit : 2 à 2,5 mm ; 1,5 mm dans les courbes serrées. <b>Triple</b> pour un trait bien visible.",
                   "Texte : au moins <b>5 mm</b> de haut pour les majuscules ; en dessous, choisissez une police « small » "
                   "ou « tiny ».",
                   "Petits détails : moins de 1 mm de large ne se brode pas bien."),
            p("Organisation", "h2"),
            *puces("Ordre de couture : le fond d'abord, les détails ensuite ; regroupez les objets de même couleur pour "
                   "limiter les changements de fil (▲▼ dans la liste).",
                   "Activez <b>Couper le fil</b> après un objet suivi d'un long saut (plus de 5 mm environ).",
                   "Regardez la simulation (onglet Points) avant d'exporter : sauts, coupes, ordre."),
            PageBreak()]

# ---------------------------------------------------------------- dépannage
contenu += [p("11. En cas de souci", "h1"),
            tableau([["Ce que je vois", "Que faire"],
                     [R + " ne fait rien", "Quittez et relancez Inkscape (les raccourcis sont lus au démarrage). "
                                            "Le menu Extensions › Broderie › Panneau de broderie fait la même chose."],
                     ["Le panneau affiche « Panneau arrêté »", "Appuyez sur " + R + " dans Inkscape : il redémarre, "
                                                               "sans perdre les modifications en attente."],
                     ["Bandeau « Dessin d'une ancienne version d'Ink/Stitch »",
                      "Ancien dessin : cliquez « Mettre à jour avec Ink/Stitch » et suivez l'indication, "
                      "ou « Ce dessin est récent » si seul le numéro de version manque."],
                     ["Une fenêtre « Ink/Stitch » s'ouvre", "Certaines commandes avancées ont leur propre fenêtre : "
                                                            "terminez-la, le résultat arrive dans le panneau."],
                     ["Inkscape semble ne pas démarrer", "Sa fenêtre d'accueil s'est peut-être ouverte sur un autre "
                                                         "bureau : Ctrl+flèche haut (Mission Control) pour la retrouver."],
                     ["Le bouton Synchroniser ne fait rien", "Autorisez Inkscape dans Réglages Système › Confidentialité "
                                                             "et sécurité › Accessibilité."]], [60, 110]),
            Spacer(1, 6 * mm),
            p("12. Versions", "h1"),
            p("Le numéro de version est affiché en haut du panneau. Pour mettre à jour : remplacez le dossier par la "
              "nouvelle version et double-cliquez de nouveau sur <b>installer.command</b>. Les modifications en attente "
              "sont conservées ; le panneau se met à jour au " + R + " suivant. Le détail des changements est dans "
              "<b>CHANGELOG.md</b>."),
            Spacer(1, 4 * mm),
            p("Testé avec Inkscape 1.4.2 et Ink/Stitch 3.3.0 sur macOS (Mac M1). Licence GPL v3, comme Ink/Stitch.", "legende")]

doc = SimpleDocTemplate(SORTIE, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm,
                        bottomMargin=20 * mm, title="Panneau de broderie — notice %s" % VERSION,
                        author="Panneau de broderie", subject="Notice d'utilisation")
doc.build(contenu, onFirstPage=pied, onLaterPages=pied)
print(SORTIE)
