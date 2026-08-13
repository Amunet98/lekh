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


## app-icon.html → the PWA icons

```sh
npm run app-icons
```

Writes all six: `android-chrome-{192,512}`, `maskable-icon-512x512`,
`apple-touch-icon`, and `favicon-{16,32}`. One source, sized in `vmin`, so a
single layout covers 16px to 512px; the maskable variant is selected by
`#maskable` in the URL.

These were hand-made PNGs with no source in the repo until the Crimson & Paper
redesign, which is exactly why the old indigo caret survived it — there was
nothing to re-render, so repainting them would have meant editing binaries.

**The `--nudge` values are measured, not guessed.** Devanagari hangs from the
शिरोरेखा rather than standing on a Latin baseline, and `ले` carries a tall ि
matra, so the ink sits low in its em box and a mark centred by that box reads
low on the tile. The correction is different per variant because the flex gap
and the caret's box move the optical centre by different amounts at each scale.
After changing `--scale`, the gap or the caret height, re-measure the ink
bounding box of the rendered PNG and re-centre — the current values put every
icon within ~4px of the tile centre.

The maskable variant must also keep its ink inside the inner 80% circle, since
Android may crop it to any shape. At the current scale the furthest corner is
~150px of a 205px safe radius.

### favicon.ico

Not produced by the script: `.ico` is a container holding several images, which
Chromium's `--screenshot` cannot write. Rebuild it from the finished 512 tile
when the icon changes:

```sh
python3 -c "from PIL import Image; \
  Image.open('public/android-chrome-512x512.png').convert('RGBA') \
    .save('public/favicon.ico', format='ICO', sizes=[(16,16),(32,32),(48,48)])"
```

Only clients that probe `/favicon.ico` directly use it — `index.html` links the
PNGs — so this rarely needs redoing.
