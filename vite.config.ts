import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      /* 'prompt', not 'autoUpdate'.
       *
       * autoUpdate is misleadingly named: it skips waiting, but an installed
       * PWA still serves the shell it already precached until every window of
       * the app has been closed. In practice that means a phone can sit on an
       * old build indefinitely with nothing on screen to say so — which is
       * exactly how a shipped redesign got reported as a rendering bug.
       *
       * 'prompt' makes the new worker wait and hands control to the app, which
       * surfaces it through src/components/UpdatePrompt.tsx. Reloading is then
       * the user's decision, and it needs to be: the editor's text is
       * component state, so a reload discards whatever they have written.
       *
       * injectRegister must be null — UpdatePrompt registers the worker itself
       * via useRegisterSW, and letting the plugin also inject a registration
       * script would register it twice. */
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'Lekh Patro — नेपाली Typing',
        short_name: 'Lekh Patro',
        id: '/',
        /* These two switch off Chrome's *automatic* PWA install offer on
           Android. Android's install is the .apk, because a PWA cannot carry
           the Patro home-screen widget — the whole reason a native build
           exists — and a visitor who took Chrome's offer instead silently got
           the version without it.

           Measured on a real Nothing Phone (A024, Android 17, Chrome 151) by
           serving this manifest and a copy with both fields deleted, over
           `adb reverse`, and listening for the event:

             with the fields    beforeinstallprompt  did NOT fire
             without them       beforeinstallprompt  DID fire

           So the suppression is real and these fields are what cause it: no
           mini-infobar, and nothing fires the prompt our own code could show.
           Verified separately in a desktop Chromium that the event still
           fires there with the fields present, so desktop install is
           untouched; iOS never used the event at all, as Add to Home Screen
           is manual.

           What this does NOT do — and cannot — is remove Chrome's ⋮ menu
           entry. Chrome 151 shows "Install and create shortcut" on every
           page: verified that example.com, which serves no manifest at all,
           offers the identical entry. That is Chrome's universal-install
           affordance, a property of the browser like bookmarking, and no
           manifest field opts out of it. On a site with a manifest it still
           opens a real "Install app" dialog. Treat the menu route as out of
           our hands; do not add manifest hacks trying to defeat it.

           Note the Play listing is internal-testing only for now, so the `url`
           below 404s for anyone who is not a tester. That is tolerable because
           what we want here is the suppression, not the store redirect, and
           the field becomes fully correct the day the listing goes public.
           Do not "simplify" by deleting the entry — that re-enables the
           automatic prompt, which is the half that does work. */
        related_applications: [
          {
            platform: 'play',
            id: 'np.com.bimeshpoudel.lekh',
            url: 'https://play.google.com/store/apps/details?id=np.com.bimeshpoudel.lekh',
          },
        ],
        prefer_related_applications: true,
        start_url: '/',
        scope: '/',
        description:
          'Type Nepali the way you already text it. Romanized-to-Devanagari transliteration, a full script cheat sheet, and a document/photo upload that reads Nepali or English text and translates it — runs entirely in your browser.',
        display: 'standalone',
        /* display_override is tried in order before `display`, which stays as
           the universal fallback. minimal-ui gives a browser that cannot do
           standalone a slim reload/back affordance instead of dropping all the
           way to a full tab with an address bar. */
        display_override: ['standalone', 'minimal-ui'],
        theme_color: '#FAFAFB',
        background_color: '#FAFAFB',
        lang: 'ne',
        dir: 'ltr',
        categories: ['productivity', 'utilities', 'education'],
        // Long-press / jump-list entries on an installed Lekh. These need real
        // targets, which is what the ?tab= handling in App.tsx exists for —
        // before it, every section lived at '/' and a shortcut could only ever
        // open the Type tab.
        //
        // Each entry NEEDS its own `icons`. Without it Android draws a blank
        // grey placeholder in the long-press sheet — it does not fall back to
        // the app icon, so the shortcuts shipped as three unlabelled squares.
        // The PNGs come from design/shortcut-icons.html via `npm run icons`;
        // the filenames and the ICONS list in that script have to stay in step
        // with these.
        shortcuts: [
          {
            name: 'Type Nepali',
            short_name: 'Type',
            description: 'Type romanized Nepali and get Devanagari as you go',
            url: '/?tab=type',
            icons: [{ src: '/shortcut-type.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Translate',
            short_name: 'Translate',
            description: 'Translate between English and Nepali, or drop in a photo or document',
            url: '/?tab=translate',
            icons: [{ src: '/shortcut-translate.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Nepali calendar',
            short_name: 'Patro',
            description: 'Bikram Sambat calendar with festivals and public holidays',
            url: '/?tab=calendar',
            icons: [{ src: '/shortcut-calendar.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        /* These two are a pair, and they are separate knobs despite sounding
         * like one. registerType: 'prompt' above stopped the plugin injecting
         * clientsClaim, and the built sw.js had none — meaning a freshly
         * installed worker never controlled the page that installed it. On a
         * first visit nothing was intercepted at all: lose signal that session
         * and you got a network error instead of the shell, and the
         * lekh-ocr-assets CacheFirst route never ran, so the ~19MB tesseract
         * payload was re-downloaded on the next launch.
         *
         * skipWaiting stays false and is stated rather than left to default,
         * because it is the half the prompt flow genuinely wants: a new worker
         * must wait for the user to press Reload, since the editor's text is
         * component state and a surprise activation would discard it. */
        clientsClaim: true,
        skipWaiting: false,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The ~19MB tesseract/tessdata payload (and the pdf.js worker) stay
        // out of the app-shell precache — fetched (and cached) on first use.
        // og-image.png joins them: it is ~290KB that only ever gets fetched by
        // a crawler unwrapping a shared link, and never by the app itself, so
        // precaching it would be pure download cost for every install.
        globIgnores: ['tesseract/**', 'tessdata/**', 'pdfjs/**', 'og-image.png'],
        runtimeCaching: [
          {
            urlPattern: /\/(tesseract|tessdata|pdfjs)\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lekh-ocr-assets',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          /* onnxruntime-web's WASM execution binary (~21MB, bundled by Vite as
           * a content-hashed asset — confirmed same-origin, not a CDN fetch).
           * transformers.js's own weight download is cached separately under
           * 'transformers-cache', but that only covers the ~600MB model
           * weights; this binary is a second, independent fetch onnxruntime
           * issues while *initialising* the inference session, and nothing
           * routed it before this rule existed.
           *
           * That gap bites on every relaunch, not just the first: the loaded
           * `translator` pipeline lives in a plain module-level variable, so
           * a killed WebView process (routine on a low-RAM device — confirmed
           * repeatedly on a 3.6GB-RAM Samsung A07) forgets it and re-runs the
           * full pipeline() init from scratch, including this fetch. Confirmed
           * on-device: on that phone, on-device translation failed outright —
           * even for one word — while offline, with the model weights already
           * cached; CacheFirst here makes the second and later inits offline
           * -safe the same way the OCR assets above already are. */
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'lekh-wasm-assets',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          /* Live calendar data. StaleWhileRevalidate is exactly the right
             handler here: the cached copy answers instantly (so paging months
             never waits on the network) while a background revalidation picks
             up holiday changes, and a month fetched once keeps working with
             the network off. The bundled table in the app covers anything
             never fetched, so a miss is never fatal. */
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com\/S4NKALP\/nepali-calendar-api\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lekh-calendar-data',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
          // Deliberately no routes for huggingface.co (transformers.js
          // manages its own 'transformers-cache' independently) or the
          // translate APIs (translate.googleapis.com, api.mymemory.
          // translated.net) — leave them unmatched so the service worker
          // passes those requests through untouched. Don't add a catch-all.
        ],
      },
    }),
  ],
  build: {
    // Forces Vite to output JavaScript compatible with older WebKit/Safari engines
    target: ['es2020', 'safari14'],
  },
})
