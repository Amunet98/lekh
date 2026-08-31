# Lekh Patro (लेख) — Nepali Typing

[![Live](https://img.shields.io/badge/Live-lekh--gamma.vercel.app-facc15)](https://lekh-gamma.vercel.app)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8)](https://lekh-gamma.vercel.app)

Type Nepali without a Nepali keyboard: write romanized Nepali — `kasto chha`
— and Lekh Patro converts it to Devanagari — कस्तो छ — as you type, IME-style,
right in the browser.

**Live (install from there):** https://lekh-gamma.vercel.app

## What it does

- **Type** — a phonetic transliteration engine backed by a 763-word
  dictionary shows suggestion chips (with spelling variants) as you type;
  a searchable Devanagari cheat sheet covers the long tail. Works with
  mobile keyboards/IMEs (Gboard-style commit flow).
- **Translate** — English ↔ Nepali with a Google-style language switcher.
  Type directly or drop in a photo, PDF, DOCX, or TXT file — OCR happens
  **entirely in the browser** via
  [Tesseract.js](https://github.com/naptha/tesseract.js), and nothing is
  uploaded to any server. Online translation by default, plus an optional
  **fully on-device** NLLB-200 model
  ([Transformers.js](https://github.com/huggingface/transformers.js)) —
  private and offline-capable once cached (large download, fetched in
  phases with progress).
- **Patro** — a Bikram Sambat calendar with festivals, public holidays and
  tithi, plus an AD ↔ BS date converter. No ads, no account, no network.

## Design

**Crimson & Paper** — the Nepali flag's colours, by role rather than by
decoration. Crimson is the only accent and it always means "you can press
this"; the flag's deep blue is folded into the neutral ramp, so every dark
surface is a blue-black rather than a neutral grey, and appears literally
only in the wordmark. Every foreground/background pair in both themes is
computed from WCAG relative luminance and recorded in `src/index.css` — the
tightest is 4.62:1, and borders come in two strengths because a decorative
hairline and a control you must be able to find have different floors.

**Material You** — on Android 12 and up, the app in the Play/APK build wears
the palette Android derives from the user's wallpaper instead, and so do the
home-screen widgets. Only the colours change: layout, spacing, shape, type and
motion are the same design underneath. Crimson & Paper stays the app's identity
on the web, in the PWA, on Android 11 and below, and for anyone who turns
wallpaper colours off in the About sheet.

It is not a lookup table. Android's shade numbers are only guaranteed to mean a
given lightness on a phone running something close to AOSP — several OEMs
substitute their own palette extraction — so `src/lib/dynamicColor.ts` walks a
candidate list per role and measures each one, holding the wallpaper's colours
to the same floors `src/index.css` records for the hand-picked ones.

The chrome is one strip: brand, section nav and actions in a single app bar
on a wide screen, with the same nav detaching to a bottom dock on a phone.
The editor is the whole Type page — the cheat sheet is a searchable panel
behind one button rather than a permanently-expanded wall of 73 cells.

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

**Holidays refresh over the network.** The bundled table is the offline
baseline and renders instantly; the app then fetches the same month from
upstream, which re-scrapes daily, so a holiday added or dropped by cabinet
decision arrives within about a day and years past the bundled range work
without a redeploy. The calendar says which source the month on screen came
from — this is the one place in Lekh Patro that touches the network, and it is not
hidden. It is a plain GET for a public file with nothing about you attached,
and the service worker caches it so a month fetched once keeps working
offline.

Two guards apply to live data, because nothing fetched at runtime has been
reviewed. A month whose length disagrees with the conversion table is
**rejected**, and so is a month with **no festival names at all** — that is
what an unpublished year looks like (BS 2084 currently returns 31 days and
zero festivals despite Baisakh 1 being नयाँ वर्ष), and rendering it would
claim the month has no festivals. Across the 36 bundled months the count runs
11–25 and is never 0, so zero is a safe signal rather than a guess.

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

**Nepal now has a two-day weekend.** Saturday has always been the weekly day
off; the cabinet added Sunday on 5 April 2026, effective the next day —
**Chaitra 23, 2082 = 6 April 2026**. The rule is dated, not global, so paging
back to BS 2081 still shows a one-day weekend rather than rewriting history.
It covers government offices and educational institutions; several local
levels rejected it and the private sector is not covered. If it is ever
reversed, add an end date to `TWO_DAY_WEEKEND_FROM` rather than deleting it.

The weekly pattern is applied as a rule and deliberately **not** taken from
the festival data, whose own holiday flag is inconsistent about weekends —
29 of 53 Saturdays in BS 2081 against 48 of 52 in BS 2082 — and does not
encode the Sunday policy at all.

One rule for anyone touching this code: **never read these dates back with
`toISOString()`.** The converter returns a Date at local midnight, and Nepal
is UTC+05:45, so a UTC read moves every festival a day earlier. That mistake
was made once already while verifying this feature and looked exactly like a
data error.

## Android home-screen widget

`android/` holds a small native Kotlin widget showing today's BS date, tithi
and festival. It exists because **a PWA cannot provide an Android home-screen
widget** — the `widgets` manifest member is Microsoft's Windows 11 Widgets
Board feature, not the Android home screen, so a native `AppWidgetProvider` is
the only route.

It shares the web app's calendar data rather than duplicating it
(`npm run android:assets`), and its date algorithm was validated against
`nepali-date-converter` over 3,970 conversions. It ships in four sizes — 2x1,
2x2, 4x1 and 5x1 — and draws in Devanagari only; there was a Latin toggle and
it was removed, because the transliteration table could not keep up with the
festival list and a widget is not where anyone wants to find that out. The
5-wide grows a week strip when you make it taller, which is what replaced the
separate 4x2 and 5x2 sizes. It ships as part of the Capacitor Android app that
wraps the web app (`capacitor.config.ts`'s `server.url` points at the live
site, so most web fixes ship without a new build), and is **on Play's internal
testing track, not publicly released** — Play requires a closed test before
production access. See `android/README.md` for the build and widget details
and `lekh-play.md` for where the release stands.

## Installing and updating

**Which one you want:**

| You are on | Install | Why |
|---|---|---|
| **Android** | the [`.apk`](https://github.com/Amunet98/lekh/releases/latest) | Home-screen widgets. A PWA cannot provide them — the `widgets` manifest member is Microsoft's Windows 11 feature, not the Android home screen — so the Android build is a real app, not an installed web page. |
| **iPhone / iPad** | the PWA — Share → Add to Home Screen | There is no Android-style install prompt on iOS, and no App Store build. |
| **Desktop** | the PWA — install button in the header | Works in any Chromium browser. |

Everything else is identical between them: same typing engine, same OCR, same
calendar, same offline behaviour. The Android app is a Capacitor WebView
pointed at the live site, so a web fix reaches it without a new download.

Lekh Patro is an installable PWA with a real service worker — the typing engine,
dictionary, and cheat sheet work offline. Details worth knowing:

- **Install button** in the header, captured from `beforeinstallprompt`.
- **Update prompt** — the app checks hourly for a new build, and when one is
  waiting it says so and offers to reload, rather than serving a stale shell
  until the OS decides otherwise. Reloading is per window: choosing "Later"
  in one window is not overridden by another window reloading, so unsaved
  editor text survives. *(If a change seems missing on a phone, check the
  version in the About sheet first (tap the ⓘ button): an installed PWA
  can be running an older shell.)*
- **App shortcuts** — long-press the installed icon to jump straight to
  Type, Translate, or Patro. These need their own icons; Android draws
  blank placeholders without them.
- **Offline from the first visit.** The worker takes control of the page that
  installed it, so the shell and the OCR payload are cached on the visit that
  fetched them rather than the one after. This is `clientsClaim` in the workbox
  config, and `grep -c clientsClaim dist/sw.js` is the check that it survived —
  switching the plugin to prompt-style updates silently drops it.

### Installing the Android app on a phone with Advanced Protection

This is the Android route — the current `.apk` is on the
[releases page](https://github.com/Amunet98/lekh/releases/latest). On iOS or
desktop you want the PWA instead, and none of this applies.

**If Android's Advanced Protection is switched on, the install will fail and
the phone will not really tell you why.** Advanced Protection is a single
master switch that turns on several protections at once, and one of them
blocks installing anything from outside the Play Store. While it is on, the
per-app "install unknown apps" permission is greyed out, so there is nothing
to toggle and no error worth reading — it simply will not proceed.

To install:

1. Open **Settings → Security & privacy → Advanced Protection**. If it is not
   there, search Settings for *Advanced Protection* — Samsung, OnePlus and
   Nothing each put it somewhere different.
2. **Turn it off.** Android will ask you to confirm.
3. Download `lekh-patro.apk` from the releases page.
4. Open the downloaded file. Android will ask whether your browser or file
   manager may install apps — allow it. (Directly: **Settings → Apps →
   Special app access → Install unknown apps**.)
5. Install.
6. **Turn Advanced Protection back on.** It only blocks *new* installs from
   outside Play — the app you just installed keeps working and keeps updating
   normally.

Step 6 is not politeness. Advanced Protection bundles real protections that
have nothing to do with sideloading, and leaving it off to keep one app is a
bad trade.

**This is your phone's setting, not a warning about this app.** Lekh Patro's
signing key is registered with Google under Android developer verification
(2026-09-01), so the separate friction Android applies to apps from
*unverified* developers — a one-time setup and a one-day wait, arriving in
some countries from 30 September 2026 — does not apply here.

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
`npm install`, so the lockfile follows). The About sheet (tap the ⓘ button)
renders that version, which is the first thing to check when debugging
"it isn't updating on my phone" — see the update prompt above.

Deployment is automatic: pushes to `main` build and deploy production on
Vercel.

---

More of my work: **[bimeshpoudel.com.np](https://www.bimeshpoudel.com.np)**
