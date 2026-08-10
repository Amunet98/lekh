# design/

Source files for generated assets. **Not served** — this directory sits outside
`public/` deliberately: anything in `public/` is published at the site root
*and* swept into the service worker precache.

## og-image.html → public/og-image.png

The 1200×630 social card.

```sh
npm run og
```

That's `scripts/render-og.mjs`, which finds the Chromium that Playwright has
cached (`~/.cache/ms-playwright/chromium-*`), renders the card headless, and
writes `public/og-image.png`. Chromium is not a dependency of this project —
if the cache is empty the script says so and tells you to run
`npx playwright install chromium`. To use a different browser:
`CHROME=/path/to/chrome npm run og`.

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
