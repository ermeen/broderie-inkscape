"""Fabrique la notice PDF du Panneau de broderie (reportlab).

Utilisation : python3 fabriquer_notice.py   →  docs/Notice-Broderie-<version>.pdf
Les captures d'écran sont dans docs/notice/images (prises avec Chrome sans fenêtre sur un dessin d'essai) ;
le logo dans docs/logo. Couleurs reprises du logo : rose poudré, vert sauge, crème.
"""
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Flowable, Frame, KeepTogether, NextPageTemplate, PageBreak,
                                PageTemplate, Paragraph, Spacer, Table, TableStyle)

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.normpath(os.path.join(ICI, "..", ".."))
with open(os.path.join(RACINE, "VERSION"), encoding="utf-8") as f:
    VERSION = f.read().strip()
SORTIE = os.path.join(RACINE, "docs", "Notice-Broderie-%s.pdf" % VERSION)
LOGO = os.path.join(RACINE, "docs", "logo", "icone.png")
LOGO_PETIT = os.path.join(RACINE, "docs", "logo", "icone-lisible.png")   # traits épaissis, lisible en petit

# ---------------------------------------------------------------- polices et couleurs
AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
for nom, i in (("Av", 7), ("Av-It", 4), ("Av-Demi", 2), ("Av-Gras", 0), ("Av-Fin", 10), ("Av-Moyen", 5)):
    pdfmetrics.registerFont(TTFont(nom, AVENIR, subfontIndex=i))
pdfmetrics.registerFontFamily("Av", normal="Av", bold="Av-Demi", italic="Av-It", boldItalic="Av-Gras")

ROSE = colors.HexColor("#d4788c")
ROSE_FONCE = colors.HexColor("#b25a6e")
ROSE_PALE = colors.HexColor("#f7e4e8")
SAUGE = colors.HexColor("#7d9a74")
SAUGE_PALE = colors.HexColor("#e7efe3")
CREME = colors.HexColor("#fcf8f4")
SABLE = colors.HexColor("#f4ece4")
ENCRE = colors.HexColor("#3d3438")
GRIS = colors.HexColor("#8c8086")
LIGNE = colors.HexColor("#eadfd9")

S = {
    "p": ParagraphStyle("p", fontName="Av", fontSize=10.3, leading=15.5, textColor=ENCRE, spaceAfter=6),
    "intro": ParagraphStyle("intro", fontName="Av", fontSize=11.5, leading=17, textColor=GRIS, spaceAfter=8),
    "h2": ParagraphStyle("h2", fontName="Av-Demi", fontSize=12.5, leading=16, textColor=ROSE_FONCE, spaceBefore=9, spaceAfter=4),
    "liste": ParagraphStyle("liste", fontName="Av", fontSize=10.3, leading=15, textColor=ENCRE, leftIndent=13,
                            bulletIndent=2, bulletFontName="Av-Demi", bulletColor=ROSE, spaceAfter=3),
    "legende": ParagraphStyle("legende", fontName="Av-It", fontSize=8.8, leading=12, textColor=GRIS, alignment=TA_CENTER),
    "cel": ParagraphStyle("cel", fontName="Av", fontSize=9.3, leading=12.5, textColor=ENCRE),
    "cel_t": ParagraphStyle("cel_t", fontName="Av-Demi", fontSize=9.3, leading=12.5, textColor=colors.white),
    "carte_t": ParagraphStyle("carte_t", fontName="Av-Demi", fontSize=11, leading=14, textColor=ENCRE, spaceAfter=4),
    "carte": ParagraphStyle("carte", fontName="Av", fontSize=9.4, leading=13.5, textColor=ENCRE, leftIndent=9,
                            bulletIndent=0, bulletColor=SAUGE, spaceAfter=2),
    "encadre": ParagraphStyle("encadre", fontName="Av", fontSize=10, leading=14.5, textColor=ENCRE),
    "encadre_t": ParagraphStyle("encadre_t", fontName="Av-Demi", fontSize=8.5, leading=11, textColor=ROSE_FONCE, spaceAfter=2),
}


def touche(t):
    """Touche de clavier (Cmd, Option, B…)."""
    return '<font name="Av-Demi" size="9" color="#b25a6e" backColor="#f7e4e8">&nbsp;%s&nbsp;</font>' % t


CMD = touche("Cmd") + " " + touche("Option") + " " + touche("B")


def p(t, st="p"):
    return Paragraph(t, S[st])


def puces(*items, st="liste"):
    return [Paragraph(t, S[st], bulletText="•") for t in items]


# ---------------------------------------------------------------- éléments de mise en page
class Chapitre(Flowable):
    """Ouverture de chapitre : numéro dans une pastille rose, titre, fil sauge."""
    def __init__(self, num, titre, sous=None):
        super().__init__()
        self.num, self.titre, self.sous = num, titre, sous

    def wrap(self, aw, ah):
        self.aw = aw
        return aw, 21 * mm if self.sous else 16 * mm

    def draw(self):
        c = self.canv
        h = 21 * mm if self.sous else 16 * mm
        y = h - 9 * mm
        c.setFillColor(ROSE)
        c.circle(5.2 * mm, y, 5.2 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Av-Demi", 13)
        c.drawCentredString(5.2 * mm, y - 1.6 * mm, str(self.num))
        c.setFillColor(ENCRE)
        c.setFont("Av-Demi", 19)
        c.drawString(14 * mm, y - 2.4 * mm, self.titre)
        if self.sous:
            c.setFillColor(GRIS)
            c.setFont("Av", 10.5)
            c.drawString(14 * mm, y - 8.5 * mm, self.sous)
        c.setStrokeColor(SAUGE)
        c.setLineWidth(1.2)
        c.line(14 * mm, 1.2 * mm, 40 * mm, 1.2 * mm)


class Capture(Flowable):
    """Capture d'écran dans un cadre arrondi, avec une ombre douce."""
    def __init__(self, nom, largeur):
        super().__init__()
        self.f = os.path.join(ICI, "images", nom + ".png")
        w, h = ImageReader(self.f).getSize()
        self.w, self.h = largeur * mm, largeur * mm * h / w

    def wrap(self, aw, ah):
        self.dx = (aw - self.w) / 2
        return aw, self.h + 3 * mm

    def draw(self):
        c, r, x, y = self.canv, 3 * mm, self.dx, 2 * mm
        for k, a in ((2.2, 0.05), (1.4, 0.07), (0.7, 0.09)):           # ombre
            c.setFillColor(colors.Color(0.35, 0.2, 0.25, alpha=a))
            c.roundRect(x - k * 0.3 * mm, y - k * mm, self.w + k * 0.6 * mm, self.h + k * 0.6 * mm, r + k * mm, stroke=0, fill=1)
        c.setFillAlpha(1)                      # l'ombre est transparente, pas la capture
        c.saveState()
        chemin = c.beginPath()
        chemin.roundRect(x, y, self.w, self.h, r)
        c.clipPath(chemin, stroke=0, fill=0)
        c.drawImage(self.f, x, y, self.w, self.h)
        c.restoreState()
        c.setStrokeColor(LIGNE)
        c.setLineWidth(0.6)
        c.roundRect(x, y, self.w, self.h, r, stroke=1, fill=0)


def capture(nom, largeur, legende=None):
    el = [Capture(nom, largeur)]
    if legende:
        el += [Spacer(1, 1.5 * mm), p(legende, "legende")]
    return KeepTogether(el + [Spacer(1, 3 * mm)])


def encadre(texte, titre="À RETENIR", fond=ROSE_PALE, barre=ROSE):
    t = Table([[[p(titre, "encadre_t"), p(texte, "encadre")]]], colWidths=[170 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), fond), ("LINEBEFORE", (0, 0), (0, -1), 3, barre),
                           ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                           ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                           ("ROUNDEDCORNERS", [4, 4, 4, 4])]))
    return KeepTogether([t, Spacer(1, 4 * mm)])


def astuce(texte):
    return encadre(texte, "ASTUCE", SAUGE_PALE, SAUGE)


def tableau(lignes, largeurs):
    data = [[Paragraph(str(c), S["cel_t" if i == 0 else "cel"]) for c in l] for i, l in enumerate(lignes)]
    t = Table(data, colWidths=[w * mm for w in largeurs], repeatRows=1)
    style = [("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BACKGROUND", (0, 0), (-1, 0), ROSE),
             ("LINEBELOW", (0, 1), (-1, -1), 0.4, LIGNE),
             ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
             ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
             ("ROUNDEDCORNERS", [4, 4, 4, 4])]
    for i in range(1, len(lignes)):
        style.append(("BACKGROUND", (0, i), (-1, i), colors.white if i % 2 else SABLE))
    t.setStyle(TableStyle(style))
    return t


def cartes(*blocs):
    """Cartes de conseils sur deux colonnes : (titre, [lignes])."""
    cellules = []
    for titre, lignes in blocs:
        cellules.append([p(titre, "carte_t")] + puces(*lignes, st="carte"))
    rangs = [cellules[i:i + 2] + ([] if i + 1 < len(cellules) else [""]) for i in range(0, len(cellules), 2)]
    t = Table(rangs, colWidths=[84 * mm, 84 * mm], hAlign="CENTER")
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                           ("BOX", (0, 0), (-1, -1), 0, colors.white), ("INNERGRID", (0, 0), (-1, -1), 5, CREME),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                           ("ROUNDEDCORNERS", [5, 5, 5, 5])]))
    return t


def etapes(*items):
    """Étapes numérotées (pastilles sauge)."""
    lignes = [[Paragraph('<font name="Av-Demi" color="white">%d</font>' % (i + 1), ParagraphStyle(
        "n", fontName="Av-Demi", fontSize=10, alignment=TA_CENTER, leading=12)), p(t)] for i, t in enumerate(items)]
    t = Table(lignes, colWidths=[8 * mm, 160 * mm])
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (1, 0), (1, -1), 8),
             ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
    for i in range(len(lignes)):
        style += [("BACKGROUND", (0, i), (0, i), SAUGE), ("ROUNDEDCORNERS", [4, 4, 4, 4])]
    t.setStyle(TableStyle(style))
    return t


# ---------------------------------------------------------------- pages
def couverture(c, doc):
    l, h = A4
    c.setFillColor(CREME)
    c.rect(0, 0, l, h, stroke=0, fill=1)
    c.setFillColor(ROSE_PALE)                                    # grand cercle doux derrière le logo
    c.circle(l / 2, h * 0.63, 78 * mm, stroke=0, fill=1)
    c.setFillColor(colors.Color(1, 1, 1, alpha=0.55))
    c.circle(l / 2, h * 0.63, 62 * mm, stroke=0, fill=1)
    t = 92 * mm
    c.drawImage(LOGO, (l - t) / 2, h * 0.63 - t / 2, t, t, mask="auto")
    c.setFillColor(ENCRE)
    c.setFont("Av-Fin", 30)
    c.drawCentredString(l / 2, h * 0.30, "Panneau de broderie")
    c.setFillColor(GRIS)
    c.setFont("Av", 12)
    c.drawCentredString(l / 2, h * 0.30 - 9 * mm, "pour Inkscape et Ink/Stitch · notice d'utilisation")
    # devise
    c.setFillColor(ROSE_FONCE)
    c.setFont("Av-It", 15)
    c.drawCentredString(l / 2, h * 0.19, "Dessiner  ·  Régler  ·  Broder")
    c.setStrokeColor(ROSE)
    c.setLineWidth(0.8)
    c.line(l / 2 - 45 * mm, h * 0.19 - 5 * mm, l / 2 + 45 * mm, h * 0.19 - 5 * mm)
    # version
    c.setFillColor(ROSE)
    c.roundRect(l / 2 - 16 * mm, 20 * mm, 32 * mm, 8 * mm, 4 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Av-Demi", 10)
    c.drawCentredString(l / 2, 22.6 * mm, "version %s" % VERSION)


def page_courante(c, doc):
    l, h = A4
    c.setFillColor(CREME)
    c.rect(0, 0, l, h, stroke=0, fill=1)
    c.drawImage(LOGO_PETIT, 20 * mm, h - 15 * mm, 8 * mm, 8 * mm, mask="auto")
    c.setFillColor(GRIS)
    c.setFont("Av", 8.5)
    c.drawString(30 * mm, h - 12 * mm, "Panneau de broderie · notice")
    c.drawRightString(l - 20 * mm, h - 12 * mm, "version %s" % VERSION)
    c.setStrokeColor(LIGNE)
    c.setLineWidth(0.6)
    c.line(20 * mm, h - 17 * mm, l - 20 * mm, h - 17 * mm)
    c.setFillColor(ROSE)
    c.roundRect(l / 2 - 7 * mm, 9 * mm, 14 * mm, 6 * mm, 3 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Av-Demi", 8.5)
    c.drawCentredString(l / 2, 11 * mm, str(doc.page))


cadre = Frame(20 * mm, 20 * mm, 170 * mm, 252 * mm, id="texte", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc = BaseDocTemplate(SORTIE, pagesize=A4, title="Panneau de broderie — notice %s" % VERSION,
                      author="Panneau de broderie", subject="Notice d'utilisation et astuces de réglages")
doc.addPageTemplates([PageTemplate("couverture", [cadre], onPage=couverture),
                      PageTemplate("page", [cadre], onPage=page_courante)])

c = [NextPageTemplate("page"), PageBreak()]

# ---------------------------------------------------------------- 1. principe et installation
c += [Chapitre(1, "Le principe", "Chacun son rôle : le dessin, les réglages, les points"),
      p("Vous <b>dessinez dans Inkscape</b>, vous <b>réglez la broderie dans le panneau</b>, et <b>Ink/Stitch calcule "
        "les points</b>. Le panneau ne remplace ni Inkscape ni Ink/Stitch : il les rend simples à utiliser ensemble.", "intro"),
      tableau([["Je veux…", "Où ?"],
               ["Dessiner une forme, une courbe, une colonne satin", "Inkscape"],
               ["Déplacer, tourner, agrandir, supprimer (formes et textes)", "Inkscape"],
               ["Choisir le type de point, la densité, l'angle, les sous-couches", "Panneau › Objets"],
               ["Créer un texte brodé, le courber sur un tracé", "Panneau › Objets › + Texte"],
               ["Voir les points, les sauts, simuler la broderie", "Panneau › Aperçu, Points"],
               ["Choisir le cadre, centrer le motif, exporter pour la machine", "Panneau › Export"],
               ["Enregistrer le travail", "Inkscape (Cmd S)"]], [112, 58]),
      Spacer(1, 7 * mm),
      Chapitre(2, "Installer", "Une seule fois"),
      etapes("Il faut <b>Inkscape 1.4</b> et <b>Ink/Stitch 3</b> déjà installés.",
             "Double-cliquez sur <b>installer.command</b>. Si macOS refuse : clic droit › Ouvrir › Ouvrir.",
             "Quittez Inkscape puis relancez-le : le raccourci " + CMD + " est alors actif.",
             "Facultatif, pour le bouton <b>Synchroniser</b> : autorisez Inkscape dans Réglages Système › "
             "Confidentialité et sécurité › <b>Accessibilité</b>."),
      Spacer(1, 3 * mm),
      p("Pour retirer le panneau : <b>desinstaller.command</b>. Ink/Stitch n'est jamais modifié."),
      PageBreak()]

# ---------------------------------------------------------------- 3. le geste
c += [Chapitre(3, "Le geste à retenir", "Un raccourci relie Inkscape et le panneau"),
      encadre(CMD + "&nbsp; dans Inkscape (ou Extensions › Broderie › Panneau de broderie)<br/>"
              "• après avoir <b>dessiné ou sélectionné</b> : le panneau s'ouvre, ou se met à jour avec votre dessin ;<br/>"
              "• après avoir <b>changé des réglages</b> dans le panneau : ils passent dans le dessin "
              "(Cmd Z dans Inkscape les annule).", "LE RACCOURCI"),
      p("Le bas du panneau indique combien de modifications attendent d'être envoyées. Le bouton "
        "<b>Synchroniser</b> fait la même chose que le raccourci : il est <b>orange</b> quand des modifications "
        "attendent, <b>vert</b> quand tout est à jour. <b>Annuler</b> oublie les modifications pas encore envoyées."),
      encadre("<b>Avant de fermer Inkscape : " + CMD + " puis Cmd S.</b> Les réglages de broderie sont enregistrés "
              "<b>dans votre fichier .svg</b>, exactement comme Ink/Stitch les enregistre : le fichier reste utilisable "
              "avec les menus Ink/Stitch habituels.", "SAUVEGARDE", SABLE, ROSE_FONCE),
      astuce("Vous avez oublié d'envoyer vos réglages ? Ils ne sont pas perdus : le panneau les garde, même fermé, "
             "et les rattache à leur dessin. Ils partiront au prochain " + CMD + " sur ce dessin."),
      capture("etroit", 50, "En fenêtre étroite, le panneau se place à droite d'Inkscape ; élargissez-la pour avoir "
                            "l'aperçu à gauche des réglages."),
      PageBreak()]

# ---------------------------------------------------------------- 4. objets
c += [Chapitre(4, "Onglet Objets", "Régler la broderie de chaque forme"),
      capture("objets", 88, "L'aperçu des points à gauche ; les calques, les objets et leurs réglages à droite."),
      p("Choisir", "h2"),
      *puces(touche("clic") + " un objet · " + touche("Cmd") + " " + touche("clic") + " en ajouter ou en retirer · "
             + touche("Maj") + " " + touche("clic") + " toute une suite.",
             "Un clic sur le <b>nom d'un calque</b> choisit tous ses objets ; un <b>clic dans l'aperçu</b> choisit "
             "l'objet sous la souris.",
             "<b>Glissez</b> un objet ou un calque dans la liste pour changer l'ordre de couture. L'<b>œil</b> masque "
             "un objet ou un calque : il n'est plus brodé, mais reste dans la liste.",
             "Plusieurs objets : les réglages s'appliquent à tous ; <b>≠</b> signale une valeur différente d'un objet "
             "à l'autre. Les objets choisis sont entourés de pointillés bleus dans l'aperçu."),
      p("Régler", "h2"),
      *puces("<b>Type de point</b> en tuiles : Tatami, Contour, Spirale, Méandre… pour un remplissage ; Point droit, "
             "Triple, Ripple, Zigzag, Satin pour un trait.",
             "<b>Paramètres</b> essentiels en curseurs, tous les autres dans <b>Plus de réglages</b> ; <b>sous-couche</b> en tuiles ; <b>couper le fil</b> et "
             "<b>arrêter la machine</b> après l'objet.",
             "<b>Copier les réglages</b> puis <b>Coller</b> sur une autre forme, ou sur toutes celles du même type. "
             "La petite flèche circulaire remet un réglage à sa valeur par défaut.",
             "<b>Outils</b> selon le type d'objet (agencement automatique des satins, remplissage en satin, contour, "
             "redwork…) ; <b>Plus d'outils</b> pour les autres. Toutes les commandes d'Ink/Stitch restent dans "
             "Export › Outils avancés."),
      p("Lire l'aperçu", "h2"),
      *puces("<b>Points</b> : les points d'aiguille, les sauts (pointillés et grenouille), les coupes, les arrêts et les "
             "changements de couleur. Les boutons de la barre les affichent ou les masquent : grenouille (sauts), ciseaux (coupes et arrêts), carreaux (<b>densité</b> : rouge = trop serré, risque de casse ; jaune = limite) et aiguille (pénétrations).",
             "<b>Réaliste</b> : le fil sur votre tissu (choisissez sa couleur). Molette : zoom · glisser ou bouton du "
             "milieu : déplacer · double-clic : tout voir."),
      PageBreak()]

# ---------------------------------------------------------------- 5-6. satin et texte
c += [Chapitre(5, "Colonnes satin", "Le point brillant des bordures et des lettres"),
      capture("satin", 100, "Une colonne satin : type Satin, Point E, Point S ou Zigzag, densité, sous-couches."),
      p("La plus simple", "h2"),
      p("Dans Inkscape, tracez un trait (outil Plume) avec l'<b>épaisseur</b> voulue : elle devient la largeur du satin. "
        "Dans le panneau, choisissez la tuile <b>Satin</b>."),
      p("Comme dans Ink/Stitch", "h2"),
      p("Dessinez deux <b>rails</b> et des <b>traverses</b> (elles donnent le sens des points). Dans le panneau, choisissez "
        "un rail : la rubrique <b>Rails et traverses</b> propose de les <b>assembler</b> en une seule colonne."),
      Spacer(1, 4 * mm),
      Chapitre(6, "Texte brodé", "140 polices faites pour la broderie"),
      *puces("<b>+ Texte</b> : votre texte, la police (avec son aperçu), la taille et l'alignement. L'<b>aperçu des "
             "points</b> s'affiche en haut quelques secondes après chaque changement, avec la taille en mm ; un "
             "avertissement signale des lettres trop petites ou un texte plus grand que le cadre.",
             "<b>Forme</b> : Droit, <b>Arc vers le haut</b>, <b>Arc vers le bas</b> (curseur Courbure ; 100 % = presque "
             "un cercle, pour les écussons) ou <b>Sur une courbe</b> : dessinez une courbe libre dans Inkscape (Bézier, "
             "spirale, cercle), synchronisez, choisissez-la et le placement (début, centre, toute la courbe). "
             "La courbe est ensuite retirée de la broderie.",
             "<b>Ajouter au dessin</b>, puis <b>Synchroniser</b>. Le texte se déplace et se tourne dans Inkscape."),
      astuce("Une police de votre Mac ? Tapez le texte dans Inkscape puis <i>Chemin › Objet en chemin</i> : les lettres "
             "deviennent des formes, à régler en remplissage ou en satin."),
      PageBreak()]

# ---------------------------------------------------------------- 7. points
c += [Chapitre(7, "Onglet Points", "Regarder la machine broder avant de lancer"),
      capture("points", 168, "La simulation, avec les sauts (grenouilles), les changements de couleur (bobines) et la mire."),
      tableau([["Touche", "Effet"],
               [touche("P"), "lecture / pause"], [touche("R"), "recommencer"],
               [touche("flèche haut") + " " + touche("flèche bas"), "plus rapide / plus lent"],
               [touche("flèche gauche") + " " + touche("flèche droite"), "sens de l'animation"],
               [touche("+") + " " + touche("−"), "un point en avant / en arrière"],
               [touche("page haut") + " " + touche("page bas"), "commande suivante / précédente (saut, coupe, couleur)"],
               [touche("O"), "afficher les pénétrations de l'aiguille"]], [50, 120]),
      Spacer(1, 3 * mm),
      p("Les boutons du bas affichent ou masquent les pénétrations, sauts, coupes, arrêts, changements de couleur, la mire, "
        "la page (le cadre) et les informations. Le dernier bouton ouvre les préférences du simulateur (épaisseur du fil, "
        "taille des pénétrations, mire)."),
      PageBreak()]

# ---------------------------------------------------------------- 8-9. aperçu, export
c += [Chapitre(8, "Onglets Aperçu et Export", "Vérifier, choisir le cadre, envoyer à la machine"),
      capture("apercu", 112, "Rendu réaliste sur tissu, avec le nombre de points, la durée estimée, la taille et les fils."),
      capture("export", 112),
      *puces("<b>Fichier de broderie</b> : le format de votre machine (.pes Brother, .dst Tajima, .jef Janome, .exp Bernina, "
             ".vp3 Husqvarna / Pfaff…), enregistré dans Téléchargements.",
             "<b>Fiche PDF pour la machine</b> : la fiche d'Ink/Stitch à imprimer (aperçu, fils, ordre des couleurs).",
             "<b>Cadre de la brodeuse</b> : le panneau vérifie que le motif y tient. <b>Ajouter un cadre</b> ou "
             "<b>Supprimer</b> ceux que vous n'avez pas.",
             "<b>Centrer le motif dans le cadre</b> : le motif est centré et la <b>page d'Inkscape prend la taille du "
             "cadre</b>. Puis " + CMD + "."),
      PageBreak()]

# ---------------------------------------------------------------- 10. astuces
c += [Chapitre(9, "Astuces de réglages", "Des valeurs de départ, à affiner par un essai"),
      p("Ce sont des valeurs courantes en broderie machine. Faites toujours un <b>essai sur une chute du même tissu</b>, "
        "avec le même stabilisateur.", "intro"),
      tableau([["Tissu", "Densité", "Sous-couche", "Compensation", "Stabilisateur"],
               ["Coton, lin, toile", "0,40 mm", "oui", "0,2 mm", "à déchirer"],
               ["Tissu fin, soie, voile", "0,45 – 0,50 mm", "légère", "0,1 mm", "soluble ou fin"],
               ["Jersey, tee-shirt", "0,40 – 0,45 mm", "toujours", "0,3 – 0,4 mm", "à découper"],
               ["Sweat, polaire, éponge", "0,35 – 0,40 mm", "oui", "0,3 mm", "à découper + film soluble dessus"],
               ["Jean, toile épaisse", "0,35 – 0,40 mm", "oui", "0,2 mm", "à déchirer, épais"],
               ["Cuir, simili", "0,45 – 0,50 mm", "légère", "0,1 mm", "à déchirer"]], [38, 30, 26, 30, 46]),
      Spacer(1, 6 * mm),
      cartes(("Colonnes satin", ["Largeur : <b>1,5 à 7 mm</b>. Au-delà, remplissage ou « Découpe des longs points ».",
                                 "Densité : <b>0,35 à 0,45 mm</b>.",
                                 "Sous-couche : <b>Centre</b> sous 2 mm ; <b>Contour</b> de 2 à 5 mm ; "
                                 "<b>Contour + Zigzag</b> au-delà.",
                                 "Compensation : <b>0,2 à 0,4 mm</b>, plus sur la maille."]),
             ("Remplissages", ["Changez l'<b>angle</b> entre deux zones voisines (45° et 135°).",
                               "Longueur de point : <b>3 à 4 mm</b>.",
                               "Une sous-couche pour les grandes zones.",
                               "Méandre, Spirale, Contour : effets décoratifs, à voir en rendu Réaliste."]),
             ("Traits et textes", ["Point droit : <b>2 à 2,5 mm</b> ; 1,5 mm dans les courbes serrées.",
                                   "<b>Triple</b> pour un trait bien visible.",
                                   "Texte : au moins <b>5 mm</b> de haut ; en dessous, une police « small » ou « tiny ».",
                                   "Moins de 1 mm de large ne se brode pas bien."]),
             ("Organisation", ["Le fond d'abord, les détails ensuite.",
                               "Regroupez les objets de même couleur (glissez-les dans la liste).",
                               "<b>Couper le fil</b> après un saut de plus de 5 mm environ.",
                               "Regardez la simulation avant d'exporter."])),
      PageBreak()]

# ---------------------------------------------------------------- 11. dépannage
c += [Chapitre(10, "En cas de souci"),
      tableau([["Ce que je vois", "Que faire"],
               [CMD + " ne fait rien", "Quittez et relancez Inkscape. Le menu Extensions › Broderie › Panneau de broderie "
                                       "fait la même chose."],
               ["« Panneau arrêté »", "Appuyez sur " + CMD + " : il redémarre, sans perdre les modifications en attente."],
               ["Bandeau « ancienne version d'Ink/Stitch »", "Cliquez « Mettre à jour avec Ink/Stitch » et suivez "
                                                             "l'indication, ou « Ce dessin est récent »."],
               ["Une fenêtre « Ink/Stitch » s'ouvre", "Certaines commandes avancées ont leur propre fenêtre : terminez-la, "
                                                      "le résultat arrive dans le panneau."],
               ["Inkscape semble ne pas démarrer", "Sa fenêtre d'accueil est peut-être sur un autre bureau : "
                                                   + touche("Ctrl") + " " + touche("flèche haut") + " (Mission Control) pour la retrouver."],
               ["Le bouton Synchroniser ne fait rien", "Autorisez Inkscape dans Réglages Système › Confidentialité et "
                                                       "sécurité › Accessibilité."]], [58, 112]),
      Spacer(1, 8 * mm),
      Chapitre(11, "Versions et mises à jour"),
      p("Le numéro de version est affiché en haut du panneau. Pour mettre à jour : remplacez le dossier par la nouvelle "
        "version et double-cliquez de nouveau sur <b>installer.command</b>. Les modifications en attente sont conservées ; "
        "le panneau se met à jour au " + CMD + " suivant. Le détail des changements est dans <b>CHANGELOG.md</b>."),
      Spacer(1, 10 * mm),
      p("Testé avec Inkscape 1.4.2 et Ink/Stitch 3.3.0 sur macOS (Mac M1). Licence GPL v3, comme Ink/Stitch.", "legende")]

doc.build(c)
print(SORTIE)
