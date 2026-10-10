#!/usr/bin/env python3
"""Builds every Lekh Patro logo master in this folder from one geometry.

    python3 design/logo/build_mark.py      (needs fontTools; Inkscape for the lockup wordmark)

The mark — "the hanging page" — is a calendar page whose crimson header is the
शिरोरेखा of ले: ल hangs from the header's bottom edge, and the े matra rises
from its top edge as the hook the page hangs by. Writing and the patro, one
letter.

Every position is derived from the page box, not from font metrics, because
that is what makes the two joins exact: the matra's flat base sits ON the
header's top edge and ल's stem starts AT its bottom edge. Placing the glyph by
its own em box put the matra's foot 3 px inside the crimson and the stem 4 px
into it — visible at 512 px, which is the size the Play listing shows.

Letterforms are Noto Sans Devanagari Bold outlines (SIL OFL 1.1, logo use is
fine), copied below as path data so the build does not need the font: ल's
bowl, a plain stem, and the े matra. The headline itself is not used — the
header replaces it.

Output is flat path data in a 256 box with no transforms, so the same strings
drop straight into an Android VectorDrawable.
"""
import math, os, re, subprocess, tempfile
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))

TILE = "#151A2B"         # dark tile, = src/index.css dark --bg family
PAPER = "#F2F4F8"
CRIMSON_DARK = "#F87171"  # header on dark grounds (= --dark-accent)
CRIMSON_LIGHT = "#C8102E" # header on light grounds (= light --accent)

# Noto Sans Devanagari Bold, font units (1000 upm, y up)
BOWL = ("M521 315H520Q479 315 453 281.5Q427 248 417 175L284 206Q290 256 307 296Q295 304 281 308.5"
        "Q267 313 250 313Q214 313 194.5 292.5Q175 272 175 238Q175 194 211 158Q247 122 334 79L260 -23"
        "Q155 26 95 92.5Q35 159 35 247Q35 337 88.5 381.5Q142 426 226 426Q269 426 304 413Q339 400 367 377"
        "Q424 424 512 424Q516 424 521 424Z")
STEM = "M521 0H660V520H521Z"
MATRA = ("M526 615Q503 684 486 720Q469 756 449.5 769Q430 782 402 782Q384 782 364.5 778Q345 774 328 767"
         "L293 876Q320 886 349 891Q378 896 408 896Q454 896 487.5 883Q521 870 547 839Q573 808 596.5 753.5"
         "Q620 699 646 615Z")

# Page box in the 256 design space.
TOP, BOT, LEFT, RIGHT, R = 78, 232, 38, 218, 24
HEADER = 34               # header height
S = 0.185                 # glyph scale
GAP = 7                   # one-colour only: the knocked-out line between header and page

HB = TOP + HEADER
TY = HB + 520 * S                       # stem top (font y 520) lands on header bottom
TX = (LEFT + RIGHT) / 2 - (35 + 660) / 2 * S   # ल's body centred on the page
MATRA_TY = TOP + 615 * S                # matra base (font y 615) lands on header top
MATRA_TOP = MATRA_TY - 896 * S


def glyph(d, tx, ty):
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    parse_path(d, TransformPen(pen, (S, 0, 0, -S, tx, ty)))
    return pen.getCommands()


def rrect(x0, y0, x1, y1, r, cw=True):
    if cw:
        return (f"M{x0+r} {y0}H{x1-r}A{r} {r} 0 0 1 {x1} {y0+r}V{y1-r}A{r} {r} 0 0 1 {x1-r} {y1}"
                f"H{x0+r}A{r} {r} 0 0 1 {x0} {y1-r}V{y0+r}A{r} {r} 0 0 1 {x0+r} {y0}Z")
    return (f"M{x0+r} {y0}A{r} {r} 0 0 0 {x0} {y0+r}V{y1-r}A{r} {r} 0 0 0 {x0+r} {y1}H{x1-r}"
            f"A{r} {r} 0 0 0 {x1} {y1-r}V{y0+r}A{r} {r} 0 0 0 {x1-r} {y0}Z")


LA = glyph(BOWL + STEM, TX, TY)
MAT = glyph(MATRA, TX, MATRA_TY)
PAGE = rrect(LEFT, TOP, RIGHT, BOT, R)
HEAD = f"M{LEFT} {HB}V{TOP+R}A{R} {R} 0 0 1 {LEFT+R} {TOP}H{RIGHT-R}A{R} {R} 0 0 1 {RIGHT} {TOP+R}V{HB}Z"
BODY = f"M{LEFT} {HB}H{RIGHT}V{BOT-R}A{R} {R} 0 0 1 {RIGHT-R} {BOT}H{LEFT+R}A{R} {R} 0 0 1 {LEFT} {BOT-R}Z"
# One-colour: header and body separated by a knocked-out line, inset so it reads
# as the letter's headline drawn in negative — ल's hole hangs from it.
SLOT = f"M{LEFT+16} {HB-GAP}H{RIGHT-16}V{HB}H{LEFT+16}Z"

BBOX = (LEFT, MATRA_TOP, RIGHT, BOT)


def layers(header_c, page_c, matra_c):
    """Colour mark. ल is a hole in the page body (evenodd), so it is whatever is behind."""
    return [(page_c, BODY + LA, True), (header_c, HEAD, False), (matra_c, MAT, False)]


def mono_layers(c):
    return [(c, PAGE + SLOT + LA, True), (c, MAT, False)]


def paths(ls):
    return "".join(f'<path fill="{c}"{" fill-rule=\"evenodd\"" if eo else ""} d="{d}"/>' for c, d, eo in ls)


def place(inner, scale, dy=0.0):
    """Centre the mark's bbox in 256 at `scale`; dy nudges it (optical centre sits a little high)."""
    x0, y0, x1, y1 = BBOX
    tx = 128 - (x0 + x1) / 2 * scale
    ty = 128 + dy - (y0 + y1) / 2 * scale
    return f'<g transform="translate({tx:.2f} {ty:.2f}) scale({scale})">{inner}</g>'


def svg(inner, w=256, h=256, title="Lekh Patro"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f"<title>{title}</title>{inner}</svg>\n")


def reach():
    """Farthest point of the mark from its bbox centre, for the circular safe zones."""
    x0, y0, x1, y1 = BBOX
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    corner = math.hypot(RIGHT - R - cx, BOT - R - cy) + R            # rounded page corners
    tip = max(math.hypot(x - cx, y - cy) for x, y in                    # matra outline points
              [(float(a), float(b)) for a, b in re.findall(r"(-?[\d.]+)[ ,](-?[\d.]+)", MAT)])
    return max(corner, tip)


def write(name, text):
    with open(os.path.join(HERE, name), "w") as fh:
        fh.write(text)
    print("wrote", os.path.relpath(os.path.join(HERE, name), REPO))


def wordmark(fill_lekh, fill_slash, fill_patro):
    """लेख/पात्रो as outlines, shaped by Inkscape (Pango/HarfBuzz) — त्र and ो need a real shaper."""
    src = (f'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="200"><text x="0" y="150" '
           f'font-family="Noto Sans Devanagari" font-weight="700" font-size="120">'
           f'<tspan fill="{fill_lekh}">लेख</tspan><tspan fill="{fill_slash}" font-weight="400">/</tspan>'
           f'<tspan fill="{fill_patro}">पात्रो</tspan></text></svg>')
    with tempfile.TemporaryDirectory() as tmp:
        a, b = os.path.join(tmp, "in.svg"), os.path.join(tmp, "out.svg")
        open(a, "w").write(src)
        subprocess.run(["inkscape", a, "--export-text-to-path", "--export-plain-svg", "-o", b],
                       check=True, capture_output=True)
        out = open(b).read()
        q = subprocess.run(["inkscape", b, "--query-all"], check=True, capture_output=True, text=True).stdout
    body = re.search(r"<svg[^>]*>(.*)</svg>", out, re.S).group(1)
    body = re.sub(r"<metadata.*?</metadata>|<defs[^>]*/>|<defs.*?</defs>", "", body, flags=re.S)
    x, y, w, h = map(float, q.splitlines()[0].split(",")[1:5])   # root bbox
    return body, (x, y, w, h)


VECTOR = """<?xml version="1.0" encoding="utf-8"?>
<!-- GENERATED by design/logo/build_mark.py — edit that, not this. -->
<!-- {what} -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="256"
    android:viewportHeight="256">
    <group
        android:translateX="{tx:.2f}"
        android:translateY="{ty:.2f}"
        android:scaleX="{s:.4f}"
        android:scaleY="{s:.4f}">
{paths}
    </group>
</vector>
"""


def vector(ls, scale, what):
    x0, y0, x1, y1 = BBOX
    tx = 128 - (x0 + x1) / 2 * scale
    ty = 128 - (y0 + y1) / 2 * scale
    ps = "\n".join(
        f'        <path\n            android:fillColor="{c}"\n'
        + ('            android:fillType="evenOdd"\n' if eo else "")
        + f'            android:pathData="{d}" />'
        for c, d, eo in ls)
    return VECTOR.format(what=what, tx=tx, ty=ty, s=scale, paths=ps)


if __name__ == "__main__":
    ON_DARK = layers(CRIMSON_DARK, PAPER, PAPER)
    ON_LIGHT = layers(CRIMSON_LIGHT, TILE, TILE)
    r = reach()
    print(f"bbox {tuple(round(v, 1) for v in BBOX)}  reach {r:.1f}")

    # Masters, mark only, transparent ground.
    write("mark.svg", svg(place(paths(ON_LIGHT), 1.0)))
    write("mark-on-dark.svg", svg(place(paths(ON_DARK), 1.0)))
    write("mark-black.svg", svg(place(paths(mono_layers("#000")), 1.0)))
    write("mark-white.svg", svg(place(paths(mono_layers("#fff")), 1.0)))

    # App icon, full-bleed square: launchers and iOS apply their own mask.
    tile = f'<rect width="256" height="256" fill="{TILE}"/>'
    write("app-icon.svg", svg(tile + place(paths(ON_DARK), 0.80, -2)))
    # Maskable: everything inside the 80% circle (radius 102.4), with a margin.
    write("app-icon-maskable.svg", svg(tile + place(paths(ON_DARK), 92 / r)))
    # Favicon: rounded tile, mark as large as it goes — legibility beats margin at 16 px.
    write("favicon.svg", svg(f'<rect width="256" height="256" rx="48" fill="{TILE}"/>'
                             + place(paths(ON_DARK), 0.98, 1)))

    # Android adaptive icon: 108dp canvas, 66dp safe circle -> radius 78.2 in 256 units.
    res = os.path.join(REPO, "android", "app", "src", "main", "res", "drawable")
    k = 72 / r
    open(os.path.join(res, "ic_launcher_foreground.xml"), "w").write(
        vector(ON_DARK, k, "Adaptive-icon foreground. Background is @color/ic_launcher_background."))
    open(os.path.join(res, "ic_launcher_monochrome.xml"), "w").write(
        vector(mono_layers("#FFFFFFFF"), k, "Android 13+ themed icon: one colour, tinted by the system."))
    print(f"wrote android adaptive layers (scale {k:.3f})")

    # Lockups. Wordmark matches the app bar: लेख / पात्रो, पात्रो in the accent.
    for name, ls, ink, slash, accent, bg in (
        ("lockup.svg", ON_LIGHT, TILE, "#8A8F9C", CRIMSON_LIGHT, None),
        ("lockup-on-dark.svg", ON_DARK, PAPER, "#8A8F9C", CRIMSON_DARK, TILE),
    ):
        wm, (wx, wy, ww, wh) = wordmark(ink, slash, accent)
        mh = 200                                   # mark height in the lockup
        ms = mh / (BOT - MATRA_TOP)
        mark = place(paths(ls), ms)                # centred in 256
        mw = (RIGHT - LEFT) * ms
        gap = 0.32 * mw
        x_text = 128 + mw / 2 + gap
        ts = 0.62 * mh / wh                        # wordmark ~62% of the mark's height
        W = math.ceil(x_text + ww * ts + 28)
        # header band of the page sits at y≈(TOP+HB)/2 — align the wordmark's optical middle a little below it
        y_text = 128 - wh * ts / 2 + 10
        g = f'<g transform="translate({x_text - wx*ts:.2f} {y_text - wy*ts:.2f}) scale({ts:.4f})">{wm}</g>'
        ground = f'<rect width="{W}" height="256" fill="{bg}"/>' if bg else ""
        write(name, svg(ground + mark + g, W, 256))
