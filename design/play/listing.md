# Play Store listing — Lekh Patro

Kept here so it is versioned with the assets rather than living in a chat log
or only inside Play Console. Everything below is checkable against the app;
the data-safety answers in particular have to keep agreeing with the store
description and with /privacy.html.

## App name (25 / 30)

Lekh Patro: Nepali Typing

"Keyboard" is deliberately not in the name: Lekh is a typing app, not a system
keyboard, and a store page that promises one gets one-star reviews from people
who wanted to type inside WhatsApp.

## Short description (79 / 80)

Type Romanized Nepali Unicode, plus a Nepali calendar (patro), widget and tools

Changed 2026-10-15: Play Console flagged the old one ("…plus an ad-free Nepali
calendar (patro) & widget") with "may not be promoted … should not use
keywords that indicate price or promotion" — "ad-free" counts. Price and
promotion words are kept out of the title and this line; the full
description's "No ads, ever" and "free and open source" are allowed there.

## Full description (2006 / 4000)

Rewritten 2026-10-07 for search: the phrases people type into Play (Nepali
typing, Romanized Nepali Unicode, Nepali calendar/patro, BS, साइत) in plain
sentences rather than a keyword list, which Play's policy forbids. Every claim
is checkable in v1.9.49; the TOOLS section (added 2026-10-15) in v1.9.65.

Write Nepali the way you already text it. Type "namaste", press space, and it becomes नमस्ते. Lekh Patro is a Romanized Nepali Unicode typing app with an ad-free Nepali calendar (patro) built in.

TYPE NEPALI (नेपाली टाइपिङ)
• Romanized Nepali Unicode: type in English letters, get proper Nepali Unicode you can paste into Facebook, Messenger, WhatsApp, Word or anywhere else
• Follows the romanized Nepali pattern you already know: kasto chha → कस्तो छ, dhanyawaad → धन्यवाद
• Suggestions as you type, and words convert even when you go back and edit mid-sentence
• A searchable क ख ग letter chart for the characters that are hard to guess
• Copy, share, or save as a text file, Word document or PDF

NEPALI CALENDAR (नेपाली पात्रो)
• Bikram Sambat (BS) calendar with festivals, public holidays and tithi
• शुभ साइत: auspicious dates for weddings (विवाह) and bratabandha (ब्रतबन्ध)
• Partial holidays show who they are for (Kathmandu Valley only, women employees, and so on)
• BS ↔ AD date converter
• Add any festival to your phone's calendar
• Home-screen widgets in four sizes, from a small date to a full week with the next festival, in your wallpaper's colours or Lekh's own
• No ads, ever

TOOLS (उपकरण)
• Amount in words for cheques: type 1250075.50 and get बाह्र लाख पचास हजार पचहत्तर रुपैयाँ पचास पैसा मात्र, in Nepali and in English
• Preeti to Unicode: paste old Preeti-font text and get proper Nepali Unicode, or turn Unicode back into Preeti
• Currency converter with the day's Nepal Rastra Bank exchange rates
• Nepali digits and lakh/crore grouping: 12,50,075 ↔ १२,५०,०७५
• A traveller's phrasebook with pronunciation and emergency numbers, offline

TRANSLATE (अनुवाद)
• English ↔ Nepali translation
• Translate photos, screenshots, PDFs and documents
• Download the offline model once and translate with no internet at all

PRIVATE BY DESIGN
Typing, text recognition and the calendar all run on your phone. There are no accounts, no ads and no tracking. Lekh Patro is free and open source.

## Data safety

Exactly five things leave the device. Audited 2026-08-14; the NRB exchange
rates (1.9.59) added 2026-10-15 to match /privacy.html §5. Re-check before
changing these answers.

| What | Where | Carries user content? |
|---|---|---|
| Online translation | translate.googleapis.com, api.mymemory.translated.net | **Yes** — the text being translated |
| Webfonts | fonts.googleapis.com, fonts.gstatic.com | No |
| Calendar refresh | raw.githubusercontent.com | No |
| Offline model download (opt-in) | huggingface.co | No |
| Exchange rates (Tools → Currency, when opened) | www.nrb.org.np | No |

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
| `01-type.png` … `07-private.png` | Phone screenshots, 1440×2560 (9:16), 24-bit. Regenerate with `npm run play:screenshots` from `design/store-screenshots.html` |
| `raw/` | The real device captures inside those frames (A024, 2026-09-30, v1.9.34) — recapture when the UI changes |
