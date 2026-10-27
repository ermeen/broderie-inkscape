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
  - Layers and objects: multiple selection with shared settings, "select similar", drag and drop to change the stitching order (several objects, between two layers), an eye icon to stitch an object or not.
  - Stitch types as tiles, essential settings as sliders; every Ink/Stitch setting grouped by topic, each with a tip (i) and a link to the documentation.
  - **Ink/Stitch · Auto · Manual**: fabric-dependent settings computed from the design's profile (fabric, stabilizer, thread) and the shape, or set by hand.
  - Colors already in the design, copy and paste settings, favorite settings.
  - Fill start and end points placed with a click, one-click appliqué, fill to satin.
  - Lettering (140 fonts) with live preview: straight, arched or along a curve; per-letter settings.
- **Simulation**
  - Stitch-by-stitch animation or realistic render, with zoom, ruler and needle following.
  - Your machine's hoop around the design, and an adjustable **basting** outline.
- **Export**
  - Embroidery profile and "whole design in auto", group colors, trim or connect jumps.
  - **Check before export**: problems explained, with Show and Fix.
  - 21 machine formats, thread spools (75 palettes), printable machine sheet, opening machine files.
- **All Ink/Stitch commands** in one searchable list.

## Install (macOS)

Requires Inkscape 1.4 and Ink/Stitch 3. Tested with Inkscape 1.4.2 and Ink/Stitch 3.3.0 on macOS.

1. Download the latest version (*Releases*) and unzip it.
2. Double-click `installer.command`. If macOS refuses: right-click › Open › Open.
3. Quit and restart Inkscape.
4. Press **Cmd+Option+B**.

Two guides (in French) are included: a [quick guide](docs/Guide-rapide-Broderie-1.7.5.pdf) (2 pages) and a [complete illustrated guide](docs/Guide-complet-Broderie-1.7.5.pdf).

**Windows (test version):** double-click `Installer sous Windows.bat`, restart Inkscape, then press **Ctrl+Alt+B**. Test guide (in French): [TESTER-WINDOWS.md](TESTER-WINDOWS.md).

## Where are the settings saved?

In your `.svg` file, exactly as Ink/Stitch saves them. Your design remains usable with the usual Ink/Stitch menus.

## Feedback

Testers are very welcome. Please report what works and what doesn't in the [issues](https://github.com/ermeen/broderie-inkscape/issues), with your system, your Inkscape and Ink/Stitch versions.

## License

GPL v3, like Ink/Stitch, whose labels and settings list the panel uses. Ink/Stitch and Inkscape are not included: the panel uses the ones installed on your computer.
