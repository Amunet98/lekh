# Lekh (लेख) — Nepali Typing

[![Live](https://img.shields.io/badge/Live-lekh--gamma.vercel.app-facc15)](https://lekh-gamma.vercel.app)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8)](https://lekh-gamma.vercel.app)

Type Nepali without a Nepali keyboard: write romanized Nepali — `kasto chha`
— and Lekh converts it to Devanagari — कस्तो छ — as you type, IME-style,
right in the browser.

**Live (install from there):** https://lekh-gamma.vercel.app

## What it does

- **Type** — a phonetic transliteration engine backed by a 700+ word
  dictionary shows suggestion chips (with spelling variants) as you type;
  a searchable Devanagari cheat sheet covers the long tail. Works with
  mobile keyboards/IMEs (Gboard-style commit flow).
- **Upload** — OCR documents **entirely in the browser** via
  [Tesseract.js](https://github.com/naptha/tesseract.js): images, PDF,
  DOCX, and TXT, in English and Nepali. Nothing is uploaded to any server.
- **Patro** — a Bikram Sambat calendar with festivals, public holidays and
  tithi, plus an AD ↔ BS date converter. No ads, no account, no network.
- **Translate** — English ↔ Nepali with a Google-style language switcher.
  Online translation by default, plus an optional **fully on-device**
  NLLB-200 model ([Transformers.js](https://github.com/huggingface/transformers.js))
  — private and offline-capable once cached (large download, fetched in
  phases with progress).

## Design

**Crimson & Paper** — the Nepali flag's colours, by role rather than by
decoration. Crimson is the only accent and it always means "you can press
this"; the flag's deep blue is folded into the neutral ramp, so every dark
surface is a blue-black rather than a neutral grey, and appears literally
only in the wordmark. Every foreground/background pair in both themes is
computed from WCAG relative luminance and recorded in `src/index.css` — the
tightest is 4.62:1, and borders come in two strengths because a decorative
hairline and a control you must be able to find have different floors.

The chrome is one strip: brand, section nav and actions in a single app bar
on a wide screen, with the same nav detaching to a bottom dock on a phone.
The editor is the whole Type page — the cheat sheet is a searchable panel
behind one button rather than a permanently-expanded wall of 76 cells.

The first launch of a session opens on a **boot screen** instead of a landing
page, so the app announces itself once and then gets out of the way — later
launches in the same session go straight to the editor.

## The calendar, and why its festivals run out

Dates and festivals are two different problems, and only one of them is
solvable in general.

**Dates are computable.** BS months run 29–32 days on a pattern set by solar
transits rather than a formula, so every implementation ships a lookup table;
`nepali-date-converter` (MIT) has one for **BS 2000–2090**. The grid and the
converter work across that whole span.

**Festivals are not.** Dashain, Tihar, Teej, Shivaratri, Janai Purnima and
most of the rest fall on a *tithi* — a lunar day — which needs real lunar
ephemeris plus the panchang convention about which sunrise a tithi counts
against. Doing that in the browser would be a large bundle and a good chance
of landing one day out, and a Dashain on the wrong day is worse than no
Dashain at all. So they are tabulated by `npm run calendar:data`, and the
table has a hard end. **The UI states the covered range rather than rendering
an uncovered month as one that simply has no festivals in it.**

That generator cross-checks every month length against the conversion table
and **drops any year where the two sources disagree**. This is not paranoia:
BS 2084 currently disagrees on five of twelve months, and shipping it would
have put every festival from Jestha onward on the wrong square while looking
entirely normal.

Festival data comes from
[S4NKALP/nepali-calendar-api](https://github.com/S4NKALP/nepali-calendar-api)
(MIT, © 2026 Sankalp Tharu), which scrapes nepalicalendar.rat32.com — a
third-party almanac, not an official Government of Nepal notice. Public
holidays are set by cabinet decision and do move.

One rule for anyone touching this code: **never read these dates back with
`toISOString()`.** The converter returns a Date at local midnight, and Nepal
is UTC+05:45, so a UTC read moves every festival a day earlier. That mistake
was made once already while verifying this feature and looked exactly like a
data error.

## Installing and updating

Lekh is an installable PWA with a real service worker — the typing engine,
dictionary, and cheat sheet work offline. Details worth knowing:

- **Install button** in the header, captured from `beforeinstallprompt`.
- **Update prompt** — the app checks hourly for a new build, and when one is
  waiting it says so and offers to reload, rather than serving a stale shell
  until the OS decides otherwise. Reloading is per window: choosing "Later"
  in one window is not overridden by another window reloading, so unsaved
  editor text survives. *(If a change seems missing on a phone, check the
  footer version first: an installed PWA can be running an older shell.)*
- **App shortcuts** — long-press the installed icon to jump straight to
  Type, Upload, Translate, or Patro. These need their own icons; Android draws
  blank placeholders without them.
- **Offline from the first visit.** The worker takes control of the page that
  installed it, so the shell and the OCR payload are cached on the visit that
  fetched them rather than the one after. This is `clientsClaim` in the workbox
  config, and `grep -c clientsClaim dist/sw.js` is the check that it survived —
  switching the plugin to prompt-style updates silently drops it.

## Performance notes

Worth knowing before changing the look, all learned by measuring:

- **There is almost no `backdrop-filter` left, and that was the point.** The
  previous design put an ambient aurora behind everything and frosted glass on
  top of it. Every frosted surface sampled that aurora, so a moving backdrop
  meant none of the blurs could ever be cached: drifting it cost **8.8 fps
  against 30.9** on the Type page while scrolling, the same gap at 4x and 8x
  CPU throttling, so it was compositor work rather than script. Parking the
  drift recovered most of it; deleting the aurora and the glass recovered the
  rest. Blur now survives only on the app bar and the mobile dock, where the
  page genuinely scrolls underneath.
- **`backdrop-filter` makes an element a containing block for its
  `position: fixed` descendants** — the same rule `transform` carries. The app
  bar's blur therefore lives on `.app-bar::before`, not on the bar: the bottom
  dock is a child of the bar, and with the filter on the parent it anchors to
  the bar instead of the viewport and lands under the header.
- **Blur the container, not the repeated child.** `backdrop-filter` is
  per-element, so 76 cheat-sheet cells each carrying their own blur would be 76
  blur passes. The cells are plain opaque surfaces now, which is cheaper still.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Tesseract.js ·
@huggingface/transformers · nepali-date-converter

## Run locally

```bash
npm install
npm run dev
```

### Scripts

- `npm run dev` / `npm run build` / `npm run preview` — Vite
- `npm run lint` — ESLint
- `npm run og` — regenerate the Open Graph social card
- `npm run icons` — regenerate the PWA shortcut icons

Both generators render to `public/`; don't edit their output by hand.

**Every change bumps the patch version** in `package.json` (followed by
`npm install`, so the lockfile follows). The footer renders that version,
which is the first thing to check when debugging "it isn't updating on my
phone" — see the update prompt above.

Deployment is automatic: pushes to `main` build and deploy production on
Vercel.

---

More of my work: **[bimeshpoudel.com.np](https://www.bimeshpoudel.com.np)**
