/* Background-warms the OCR/PDF engines — tesseract's worker/core/wasm, both
 * language packs, and the pdf.js worker, ~20MB total — into the
 * 'lekh-ocr-assets' cache (the CacheFirst runtime route in vite.config.ts,
 * which covers all three under one urlPattern) the first time the app has a
 * connection. Without this, "scan text from photo" and "open a scanned PDF"
 * only fetch (and cache) their payload on first *use* — tesseract.ts's
 * getWorker and pdfInput.ts's loadPdfjs — so a first attempt made while
 * offline has nothing to download and nowhere cached to fall back to, and
 * fails outright. This makes that a background non-issue instead of
 * something the user has to discover by hitting it.
 *
 * Fetches both OCR languages regardless of which translation direction is
 * active, so offline scanning works either direction rather than only
 * whichever one happened to be selected when the app first went online. */

const OCR_ASSET_URLS = [
  '/tesseract/worker.min.js',
  '/tesseract/tesseract-core-simd-lstm.wasm.js',
  '/tesseract/tesseract-core-simd-lstm.wasm',
  '/tessdata/eng.traineddata.gz',
  '/tessdata/nep.traineddata.gz',
  '/pdfjs/pdf.worker.min.mjs',
]

const WARMED_KEY = 'lekh-ocr-warmed'

/* Fire-and-forget — never throws, never blocks the caller. A failed attempt
 * (offline mid-fetch, storage blocked) just leaves WARMED_KEY unset, so the
 * next launch tries again; already-cached URLs resolve straight from the
 * CacheFirst route without hitting the network twice. */
export function warmOcrCacheInBackground(): void {
  if (!navigator.onLine || !('serviceWorker' in navigator)) return
  // Respects an explicit data-saver preference. Wifi-vs-cellular detection
  // (navigator.connection.type) is left alone — support is too patchy across
  // browsers to gate a correctness fix on it, and turning data on to use the
  // app at all is exactly the signal this feature is meant to ride along with.
  const conn = (navigator as { connection?: { saveData?: boolean } }).connection
  if (conn?.saveData) return

  try {
    if (localStorage.getItem(WARMED_KEY) === '1') return
  } catch {
    // Storage blocked — proceed anyway; worst case this re-fetches (cheaply,
    // via CacheFirst) every launch instead of once.
  }

  void (async () => {
    try {
      /* .ready resolves once the registration HAS an active worker — it does
       * not mean THIS page is controlled by it yet. On a fresh install, this
       * navigation is the one that installed the worker, and clientsClaim
       * taking control of an already-loading client is a separate, slightly
       * later step. A fetch fired between those two points slips straight to
       * the network past the CacheFirst route: it still resolves .ok, so
       * WARMED_KEY gets set, but nothing was ever written to
       * 'lekh-ocr-assets' — a silent, permanent no-op, confirmed on-device
       * (fresh install: warmed='1', cache never created; the exact fetch
       * repeated after `controller` was actually set cached correctly).
       * controllerchange is what actually fires when clientsClaim finishes. */
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
        })
      }
      const results = await Promise.allSettled(OCR_ASSET_URLS.map((url) => fetch(url)))
      if (results.every((r) => r.status === 'fulfilled' && r.value.ok)) {
        localStorage.setItem(WARMED_KEY, '1')
      }
    } catch {
      // Offline mid-fetch or similar — WARMED_KEY stays unset, retried next launch.
    }
  })()
}
