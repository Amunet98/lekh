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

Lekh is an installable PWA with a real service worker — the typing engine,
dictionary, and cheat sheet work offline. There's an explicit Install
button in the header (captures `beforeinstallprompt`), plus light/dark
themes.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Tesseract.js ·
@huggingface/transformers

## Run locally

```bash
npm install
npm run dev
```

Deployment is automatic: pushes to `main` build and deploy production on
Vercel.

---

More of my work: **[bimeshpoudel.com.np](https://www.bimeshpoudel.com.np)**
