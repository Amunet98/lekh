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
  a built-in Devanagari cheat sheet covers the long tail. Works with
  mobile keyboards/IMEs (Gboard-style commit flow).
- **Upload** — OCR documents **entirely in the browser** via
  [Tesseract.js](https://github.com/naptha/tesseract.js): images, PDF,
  DOCX, and TXT, in English and Nepali. Nothing is uploaded to any server.
- **Translate** — English ↔ Nepali with a Google-style language switcher.
  Online translation by default, plus an optional **fully on-device**
  NLLB-200 model ([Transformers.js](https://github.com/huggingface/transformers.js))
  — private and offline-capable once cached (large download, fetched in
  phases with progress).

## Design

**Ink & Glass** — a writing tool rather than stationery: frosted glass over
an ink-dark ground, with light and dark themes whose glass opacity is
measured per theme rather than shared. The first launch of a session opens
on a **boot screen** instead of a landing page, so the app announces itself
once and then gets out of the way — later launches in the same session go
straight to the editor.

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
  Type, Upload, or Translate. These need their own icons; Android draws
  blank placeholders without them.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Tesseract.js ·
@huggingface/transformers

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
