<p align="center"><img src="docs/logo/icone.png" width="160" alt="Broderie"></p>

# Broderie — an embroidery panel for Inkscape

*[Version française](README.md)*

A simple, visual interface for [Ink/Stitch](https://inkstitch.org), inside [Inkscape](https://inkscape.org).

You **draw in Inkscape**, you **set up the embroidery in the panel**, and **Ink/Stitch computes the stitches**. One shortcut links both: **Cmd+Option+B**.

Ink/Stitch remains the engine: the panel does not replace it, it makes it easier to use. Every Ink/Stitch setting and command is available, grouped by topic instead of spread across many dialogs.

![The embroidery panel](docs/notice/images/objets.png)

> **Language:** the panel's interface is in French for now. An English interface can be added if there is interest — please say so in the issues.
>
> **Platforms:** macOS (tested). Windows: test version, see below.

## What the panel does

- **Objects**
  - Layers and objects: multiple selection with shared settings, drag and drop to change the stitching order, an eye icon to stitch an object or not.
  - Stitch types as tiles, essential settings as sliders; all Ink/Stitch settings grouped by topic.
  - Copy and paste settings.
  - Satin columns: convert a stroke, join rails and rungs.
  - Lettering (140 fonts) with live preview: straight, arched (up to a full circle) or along a curve drawn in Inkscape.
- **Simulation**
  - Stitch-by-stitch animation (jumps, trims, color changes) or realistic render on fabric, with zoom.
  - Your machine's hoop drawn around the design, and an adjustable **basting** outline (distance, stitch length, corner radius).
- **Export**
  - 21 machine formats.
  - Thread spools: thread brand (75 Ink/Stitch palettes), closest spool for each color, apply exact thread colors.
  - Estimated stitching time.
- **All Ink/Stitch commands** in one searchable list.

## Install (macOS)

Requires Inkscape 1.4 and Ink/Stitch 3. Tested with Inkscape 1.4.2 and Ink/Stitch 3.3.0 on macOS.

1. Download the latest version (*Releases*) and unzip it.
2. Double-click `installer.command`. If macOS refuses: right-click › Open › Open.
3. Quit and restart Inkscape.
4. Press **Cmd+Option+B**.

A full illustrated guide (in French) is included: [docs/Notice-Broderie-1.7.0.pdf](docs/Notice-Broderie-1.7.0.pdf).

**Windows (test version):** double-click `Installer sous Windows.bat`, restart Inkscape, then press **Ctrl+Alt+B**. Test guide (in French): [TESTER-WINDOWS.md](TESTER-WINDOWS.md).

## Where are the settings saved?

In your `.svg` file, exactly as Ink/Stitch saves them. Your design remains usable with the usual Ink/Stitch menus.

## Feedback

Testers are very welcome. Please report what works and what doesn't in the [issues](https://github.com/ermeen/broderie-inkscape/issues), with your system, your Inkscape and Ink/Stitch versions.

## License

GPL v3, like Ink/Stitch, whose labels and settings list the panel uses. Ink/Stitch and Inkscape are not included: the panel uses the ones installed on your computer.
