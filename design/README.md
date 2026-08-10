# design/

Source files for generated assets. **Not served** — this directory is outside
`public/`, deliberately: anything in `public/` is published at the site root
*and* swept into the service worker precache.

## og-image.html → public/og-image.png

The 1200×630 social card. Render it with the Chromium that Playwright already
cached:

```sh
~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome \
  --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --virtual-time-budget=8000 \
  --screenshot=public/og-image.png \
  "file://$PWD/design/og-image.html"
```

`--virtual-time-budget` is what waits for the Google Fonts request; without it
the card renders in a fallback face and the Devanagari comes out wrong. The
card also hardcodes a copy of the dark palette from `src/index.css` — it is a
PNG, so it cannot import tokens. Re-render it whenever the palette changes.
