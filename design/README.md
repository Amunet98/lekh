# design/

Source files for generated assets. **Not served** — this directory sits outside
`public/` deliberately: anything in `public/` is published at the site root
*and* swept into the service worker precache.

Both renderers share `scripts/lib/chromium.mjs`, which finds the Chromium that
Playwright has cached (`~/.cache/ms-playwright/chromium-*`). Chromium is not a
dependency of this project — if the cache is empty the scripts say so and tell
you to run `npx playwright install chromium`. To use a different browser:
`CHROME=/path/to/chrome npm run <script>`.

## shortcut-icons.html → public/shortcut-{type,upload,translate,calendar}.png

```sh
npm run icons
```

The 192×192 marks Android shows when you long-press the installed app. **A
manifest `shortcuts` entry without its own `icons` array renders as a blank
grey placeholder** — Android does not fall back to the app icon. That is how
these shipped as three unlabelled squares.

One file renders all four, selected by `location.hash`. The selector fails
open to `type`, so a typo produces *identical* files rather than an error —
check they differ (`md5sum public/shortcut-*.png | awk '{print $1}' | sort -u
| wc -l` should equal the number of icons) before committing.

Do not add `vector-effect: non-scaling-stroke` to these. It pins the stroke to
N device pixels regardless of the viewBox, which drew hairlines on a 192px tile
that would have been sub-pixel once Android shrank them to ~24dp.

The filenames here, the `ICONS` list in `scripts/render-shortcut-icons.mjs`,
and the `shortcuts` array in `vite.config.ts` all have to stay in step.

## og-image.html → public/og-image.png

The 1200×630 social card.

```sh
npm run og
```

### When to re-render

**Whenever the palette changes.** The card hardcodes a copy of the dark tokens
from `src/index.css`, because it is a PNG and cannot import them. The palette
has moved four times so far (Paper & Ink → Ink & Slate → Ink & Glass →
Crimson & Paper), so this is not a hypothetical.

Nothing will remind you. An OG image is never visible during development — only
inside someone else's feed — and X and LinkedIn cache it hard per URL, so a
stale card propagates quietly and re-rendering does **not** fix shares that
already went out. That asymmetry is the whole reason this is one command.

### Checking the result

Open the PNG and confirm the Devanagari rendered in Anek Devanagari and Noto
Sans Devanagari, not in a fallback face. `--virtual-time-budget` is what waits
for the Google Fonts request; if it ever proves too short, the card still
renders and still looks like a card — which makes a wrong font the failure mode
most likely to ship unnoticed.

The render is deterministic: re-running it on an unchanged source produces a
byte-identical file, so `git status` staying clean is a real signal that
nothing drifted.


## logo/ → every app icon

```sh
python3 design/logo/build_mark.py   # geometry → SVG masters + Android adaptive layers
npm run app-icons                   # SVG masters → every PNG + favicon.ico
```

The mark (2026-10-10, "the hanging page") and how to use it are in
[`logo/README.md`](logo/README.md). The pipeline is two steps:

1. `build_mark.py` holds the geometry and writes the SVG masters in `logo/`
   plus `android/…/res/drawable/ic_launcher_{foreground,monochrome}.xml`. It
   needs fontTools; Inkscape only for the lockups' outlined wordmark.
2. `render-app-icons.mjs` rasterises the masters with sharp — the six PWA and
   favicon PNGs in `public/`, `favicon.ico` (16/32/48), the five legacy
   launcher mipmaps, and `design/play/icon-512.png`.

No browser and no web font is involved any more. The previous source,
`app-icon.html`, set ले in Anek Devanagari from Google Fonts and needed a
cached Chromium plus an 8-second font budget; a missing font rendered quietly
in a fallback face. The masters are plain paths, so a render is a render.

**The Play listing icon is not uploaded by `play:publish`** — replace
`design/play/icon-512.png` in the Console by hand. **The launcher icon ships
in the APK**, so phones only get it with the next store release; the web
icons go live on the next deploy.

## store-screenshots.html → design/play/0N-*.png

```sh
npm run play:screenshots
```

The seven Play Store phone screenshots (1440×2560): a headline, a Devanagari
kicker and a **real** device capture from `design/play/raw/` in a phone frame,
each on its own ground (crimson, paper, flag blue, night, marigold, wallpaper
violet, paper). The renderer flattens to RGB because Play rejects screenshots
with an alpha channel.

The captures are real on purpose — re-shoot them when the UI changes rather
than editing pixels. Recipe (2026-09-30): the `.dev` debug APK driven over CDP
(see lekh-claude.md), wallpaper colours OFF in that copy so the app wears
Crimson & Paper, `font_scale` 1.0, and Android's SystemUI demo mode for a clean
status bar (`am broadcast -a com.android.systemui.demo -e command clock -e hhmm
0941`, battery 100, notifications hidden). Restore all three afterwards. The
widgets come from `WidgetPreviewActivity` and keep the wallpaper palette,
because that is what they really do; they are cut out with a geometric
rounded-rect mask (radius 60px at 3x) — a colour-distance mask eats the light
text near the corners.

Re-shot 2026-10-06 for v1.9.46 (Clear in the toolbar, the Letters button, the
today line in Patro's month bar, Export beside Copy). Two traps on that run:
SystemUI demo mode only took after `sysui_demo_allowed 1` had been set for a
moment, so send `enter` again if the real clock is still showing; and wifi
needs `-e fully true` or it is drawn with a no-internet `!`. Open the cheat
sheet with a real `adb shell input tap`, not a scripted `.click()`, or the
sheet's grabber shows a focus ring.

`npm run play:screenshots` needs a Playwright Chromium. Brave's one-shot
`--screenshot` hangs, so without one the slides were rendered over CDP in
headless Brave instead (navigate to `about:blank` between slides: a hash-only
change does not re-run the slide picker).

## `promo-video.html` → `play/lekh-patro-promo.mp4`

A 30-second, 1920×1080 promo video for the Play listing (Play takes it as a
YouTube link, so the MP4 is what gets uploaded there). Intro and outro cards on
paper with the wordmark; four feature cards (Type, Letters, Translate, Patro)
on the screenshots' grounds, each with a real screen recording composited into
a phone frame. `promo-video.html#<card>` renders each card; `#frame` is the
bezel layer with a transparent screen, laid over the recording so its inner
curve rounds the recording's corners.

Recipe: the same `.dev` + demo-mode setup as the screenshots, then `adb shell
screenrecord --size 720x1600` while the app is driven over CDP (typing is
`Input.insertText` one character at a time, so the suggestion strip and the
conversion show on screen). Cards rendered to PNG at 1920×1080; each segment is
`ffmpeg` overlaying the trimmed recording (scaled to 405×900 at 330,90) between
its card and the bezel; segments joined with 0.4s `xfade` fades and a silent
AAC track. Find cut points from the recording's pixels (the dimmed app bar
when a sheet is open, the dock highlight), not from wall-clock marks taken
while driving it: screenrecord's start lag made those a second or more out.
