# Play Store listing — Lekh Patro

Kept here so it is versioned with the assets rather than living in a chat log
or only inside Play Console. Everything below is checkable against the app;
the data-safety answers in particular have to keep agreeing with the store
description and with /privacy.html.

## Short description (67 / 80)

Phonetic Nepali typing and an ad-free Bikram Sambat patro, offline.

## Full description

Lekh Patro lets you write Nepali the way you already text it. Type "namaste" and
press space — it becomes नमस्ते. No new keyboard layout to learn, no muscle
memory to rebuild.

**Type** — Roman to Devanagari as you type, with suggestions and a searchable
क ख ग reference for the characters that are hard to guess.

**Patro** — the Bikram Sambat calendar, with festivals and public holidays. No
ads, ever. Add the home-screen widget in any of six sizes, from a compact date
to a full week strip with the next festival. Nepali or English script, your
choice.

**Upload** — pull Nepali or English text out of photos, screenshots and PDFs.
The image never leaves your phone.

**Translate** — English ↔ Nepali. Download the offline model once and it works
with no connection at all.

Typing, character recognition and the calendar all run on your device. There
are no accounts, no advertising and no tracking of any kind. Lekh Patro is free and
open source.

## Data safety

Exactly four things leave the device. Audited 2026-08-14; re-check before
changing these answers.

| What | Where | Carries user content? |
|---|---|---|
| Online translation | translate.googleapis.com, api.mymemory.translated.net | **Yes** — the text being translated |
| Webfonts | fonts.googleapis.com, fonts.gstatic.com | No |
| Calendar refresh | raw.githubusercontent.com | No |
| Offline model download (opt-in) | huggingface.co | No |

Everything else — typing, transliteration, OCR, PDF parsing, the Bikram Sambat
grid — is local. No accounts, no analytics, no advertising, no cookies. The
widget makes no network requests at all.

Declare: no data collected; text is *shared* with a third party only for the
online translation feature, transient, not stored, and user-initiated.

- Privacy policy: https://lekh-gamma.vercel.app/privacy.html
- Ads: none
- In-app purchases: none
- Target audience: general (NOT designed for families)
- App category: Productivity

## Assets in this folder

| File | Use |
|---|---|
| `icon-512.png` | App icon, 512×512, 32-bit with alpha |
| `feature-graphic.png` | 1024×500, regenerate with `npm run play:feature` |
| `01-type.png` … `05-widgets.png` | Phone screenshots, 1080×1920 (9:16) |
