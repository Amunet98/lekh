import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'Lekh — नेपाली Typing',
        short_name: 'Lekh',
        id: '/',
        start_url: '/',
        scope: '/',
        description:
          'Type Nepali the way you already text it. Romanized-to-Devanagari transliteration, a full script cheat sheet, and a camera scanner that reads Nepali or English documents and translates them — runs entirely in your browser.',
        display: 'standalone',
        theme_color: '#16171d',
        background_color: '#16171d',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // The ~19MB tesseract/tessdata payload (and the pdf.js worker) stay
        // out of the app-shell precache — fetched (and cached) on first use.
        globIgnores: ['tesseract/**', 'tessdata/**', 'pdfjs/**'],
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
