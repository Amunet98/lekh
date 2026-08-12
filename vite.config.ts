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
        name: 'Lekh — नेपाली Typing',
        short_name: 'Lekh',
        id: '/',
        start_url: '/',
        scope: '/',
        description:
          'Type Nepali the way you already text it. Romanized-to-Devanagari transliteration, a full script cheat sheet, and a document/photo upload that reads Nepali or English text and translates it — runs entirely in your browser.',
        display: 'standalone',
        theme_color: '#FBFBFA',
        background_color: '#FBFBFA',
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
            name: 'Read a photo or PDF',
            short_name: 'Upload',
            description: 'Pull Nepali or English text out of an image or document',
            url: '/?tab=upload',
            icons: [{ src: '/shortcut-upload.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Translate',
            short_name: 'Translate',
            description: 'Translate between English and Nepali',
            url: '/?tab=translate',
            icons: [{ src: '/shortcut-translate.png', sizes: '192x192', type: 'image/png' }],
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
