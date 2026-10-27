"""Mise en page commune des guides PDF du Panneau de broderie (reportlab) : polices, couleurs, styles,
chapitres, captures, encadrés, tableaux, couverture et pied de page.
Les captures d'écran sont dans docs/notice/images ; le logo dans docs/logo.
Couleurs reprises du logo : rose poudré, vert sauge, crème.
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


def _jpeg(chemin):
    """Capture en JPEG (qualité 90) : reportlab garderait le PNG non compressé, le PDF serait trop lourd."""
    import io
    from PIL import Image
    tampon = io.BytesIO()
    Image.open(chemin).convert("RGB").save(tampon, "JPEG", quality=90, optimize=True)
    tampon.seek(0)
    return ImageReader(tampon)


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
        c.drawImage(_jpeg(self.f), x, y, self.w, self.h)
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
def couverture(c, doc, sous_titre="pour Inkscape et Ink/Stitch · notice d'utilisation"):
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
    c.drawCentredString(l / 2, h * 0.30 - 9 * mm, sous_titre)
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


def page_courante(c, doc, titre="Panneau de broderie · notice"):
    l, h = A4
    c.setFillColor(CREME)
    c.rect(0, 0, l, h, stroke=0, fill=1)
    c.drawImage(LOGO_PETIT, 20 * mm, h - 15 * mm, 8 * mm, 8 * mm, mask="auto")
    c.setFillColor(GRIS)
    c.setFont("Av", 8.5)
    c.drawString(30 * mm, h - 12 * mm, titre)
    c.drawRightString(l - 20 * mm, h - 12 * mm, "version %s" % VERSION)
    c.setStrokeColor(LIGNE)
    c.setLineWidth(0.6)
    c.line(20 * mm, h - 17 * mm, l - 20 * mm, h - 17 * mm)
    c.setFillColor(ROSE)
    c.roundRect(l / 2 - 7 * mm, 9 * mm, 14 * mm, 6 * mm, 3 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.setFont("Av-Demi", 8.5)
    c.drawCentredString(l / 2, 11 * mm, str(doc.page))


CADRE = dict(x1=20 * mm, y1=20 * mm, width=170 * mm, height=252 * mm, leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)


def document(sortie, titre, sujet, sous_titre, pied, couverture_pleine=True):
    """Document A4 : couverture (si demandée) puis pages courantes avec le pied de page « pied »."""
    d = BaseDocTemplate(sortie, pagesize=A4, title=titre, author="Panneau de broderie", subject=sujet)
    modeles = []
    if couverture_pleine:
        modeles.append(PageTemplate("couverture", [Frame(id="c", **CADRE)], onPage=lambda c, doc: couverture(c, doc, sous_titre)))
    modeles.append(PageTemplate("page", [Frame(id="t", **CADRE)], onPage=lambda c, doc: page_courante(c, doc, pied)))
    d.addPageTemplates(modeles)
    return d
