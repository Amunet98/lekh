/* What the app is holding on the device, and how to hand it back.
 *
 * Two features here download a lot and never mention it again: the on-device
 * translation model is roughly 900MB of weights and the OCR/PDF engines
 * another ~19MB, both parked in Cache Storage indefinitely. Someone who tried
 * on-device translation once had no way to see that, and no way to reclaim it
 * short of clearing site data for the whole app — which also takes their
 * draft, their theme and every setting with it.
 *
 * The caches are named in vite.config.ts's Workbox runtime routes, except
 * transformers-cache, which transformers.js opens itself.
 */

const HEAVY_CACHES = [
  'transformers-cache', // on-device translation model weights
  'lekh-wasm-assets', // onnxruntime-web, needed by the model
  'lekh-ocr-assets', // tesseract, tessdata and pdf.js
]

const MODEL_FLAGS = ['lekh:ondevice-model-downloaded', 'lekh-ocr-warmed']

/** Bytes held by the downloadable extras, or null if the browser won't say. */
export async function estimateHeavyCaches(): Promise<number | null> {
  try {
    if (typeof caches === 'undefined') return null
    let total = 0
    for (const name of HEAVY_CACHES) {
      if (!(await caches.has(name))) continue
      const cache = await caches.open(name)
      for (const request of await cache.keys()) {
        const response = await cache.match(request)
        if (!response) continue
        /* Content-Length rather than reading the body: these are hundred-
           megabyte entries and blob()-ing each one to measure it would pull
           the whole model back through memory just to say how big it is. A
           range/opaque response without the header is skipped rather than
           guessed at, so this can under-report and never over-report. */
        const length = Number(response.headers.get('content-length'))
        if (Number.isFinite(length)) total += length
      }
    }
    return total
  } catch {
    return null
  }
}

/** Delete them, and the flags that claim they are present. */
export async function clearHeavyCaches(): Promise<void> {
  if (typeof caches !== 'undefined') {
    await Promise.all(HEAVY_CACHES.map((name) => caches.delete(name)))
  }
  for (const key of MODEL_FLAGS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // Blocked storage — the cache is gone either way, and the flag is only
      // ever a hint that the next load re-checks against reality.
    }
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
