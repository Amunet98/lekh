# design/

Source files for generated assets. **Not served** — this directory sits outside
`public/` deliberately: anything in `public/` is published at the site root
*and* swept into the service worker precache.

Both renderers share `scripts/lib/chromium.mjs`, which finds the Chromium that
Playwright has cached (`~/.cache/ms-playwright/chromium-*`). Chromium is not a
dependency of this project — if the cache is empty the scripts say so and tell
you to run `npx playwright install chromium`. To use a different browser:
`CHROME=/path/to/chrome npm run <script>`.

## shortcut-icons.html → public/shortcut-{type,upload,translate}.png

```sh
npm run icons
```

The 192×192 marks Android shows when you long-press the installed app. **A
manifest `shortcuts` entry without its own `icons` array renders as a blank
grey placeholder** — Android does not fall back to the app icon. That is how
these shipped as three unlabelled squares.

One file renders all three, selected by `location.hash`. The selector fails
open to `type`, so a typo produces three *identical* files rather than an
error — check they differ (`md5sum public/shortcut-*.png`) before committing.

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
has moved three times so far (Paper & Ink → Ink & Slate → Ink & Glass), so this
is not a hypothetical.

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
