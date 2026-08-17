import type { TranslationProvider, TranslateOptions, ModelLoadProgress } from './provider'

const MODEL_ID = 'Xenova/nllb-200-distilled-600M'
const CONFIRM_KEY = 'lekh:ondevice-model-confirmed'
const DOWNLOADED_KEY = 'lekh:ondevice-model-downloaded'

export function hasConfirmedDownload(): boolean {
  try {
    return localStorage.getItem(CONFIRM_KEY) === '1'
  } catch {
    return false
  }
}

export function setConfirmedDownload(): void {
  try {
    localStorage.setItem(CONFIRM_KEY, '1')
  } catch {
    // localStorage unavailable — the confirmation just won't be remembered
  }
  // Best-effort request to protect the ~900MB Cache API entry from eviction
  // under storage pressure (matters most on mobile browsers).
  void navigator.storage?.persist?.()
}

// UI hint only: the browser may still evict the cached model, in which case
// the next load simply re-downloads and the progress UI reports it truthfully.
export function hasDownloadedModel(): boolean {
  try {
    return localStorage.getItem(DOWNLOADED_KEY) === '1'
  } catch {
    return false
  }
}

function setDownloadedModel(): void {
  try {
    localStorage.setItem(DOWNLOADED_KEY, '1')
  } catch {
    // localStorage unavailable — the flag just won't be remembered
  }
}

// The localStorage flag above is only an instant-paint hint — it can go
// stale in both directions (browser evicts the Cache Storage entry under
// storage pressure; or the flag is lost while the cache survives). This
// checks the actual Cache API entry transformers.js reads from
// ('transformers-cache', confirmed against node_modules/@huggingface/
// transformers/src/utils/hub.js) so the UI never lies about a real
// ~900MB re-download.
export async function isModelCached(): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return hasDownloadedModel()
    const cache = await caches.open('transformers-cache')
    const keys = await cache.keys()
    return keys.some((req) => req.url.includes(MODEL_ID) && req.url.endsWith('.onnx'))
  } catch {
    return hasDownloadedModel()
  }
}

type TranslationPipeline = (
  text: string,
  options: {
    src_lang: string
    tgt_lang: string
    no_repeat_ngram_size?: number
    repetition_penalty?: number
  },
) => Promise<Array<{ translation_text: string }> | { translation_text: string }>

let translator: TranslationPipeline | null = null
let loadingPromise: Promise<TranslationPipeline> | null = null

// getTranslator() dedupes concurrent loads onto one loadingPromise, but a
// caller that joins an in-flight load still needs its own progress updates —
// so every active caller's onProgress lives here for the load's duration,
// and loadPipeline() broadcasts to all of them instead of a single callback.
const progressListeners = new Set<(p: ModelLoadProgress) => void>()

function broadcastProgress(p: ModelLoadProgress): void {
  for (const listener of progressListeners) listener(p)
}

interface ProgressEvent {
  status: string
  file?: string
  loaded?: number
  total?: number
}

async function loadPipeline(): Promise<TranslationPipeline> {
  // Files fire per-file initiate/progress/done events; aggregate them into one
  // honest overall byte count. totalBytes grows as later files initiate, so
  // the bar can dip early on — acceptable trade-off for real numbers.
  const files = new Map<string, { loaded: number; total: number; done: boolean }>()
  let lastPercent = -1
  let lastLoadedMB = -1

  const emit = () => {
    if (progressListeners.size === 0) return
    let loadedBytes = 0
    let totalBytes = 0
    let allDone = files.size > 0
    for (const f of files.values()) {
      loadedBytes += f.loaded
      totalBytes += f.total
      if (!f.done) allDone = false
    }
    /* The threshold is 1MB rather than 0, and that is not fussiness.
     *
     * transformers.js initiates the small metadata files (config, tokenizer)
     * before the ~900MB weights, so the first tick has a real but tiny total
     * — which the MB formatter renders as the memorably useless
     * "Downloading model… 0 MB / 0 MB". On a slow link that is the first thing
     * anyone sees, and it reads as stuck rather than starting. Below 1MB there
     * is nothing worth reporting, so it stays in 'preparing'. */
    if (allDone || totalBytes < 1e6) {
      // Every fetched file is complete (or nothing is streaming, e.g. a
      // Firefox cache hit fires no progress events) — the remaining wait is
      // ONNX session init, which has no measurable progress.
      broadcastProgress({ phase: 'preparing' })
      return
    }
    // Throttle: transformers.js fires per-chunk; only re-render on a visible
    // change (integer percent or whole MB).
    const percent = Math.floor((loadedBytes / totalBytes) * 100)
    const loadedMB = Math.floor(loadedBytes / 1e6)
    if (percent === lastPercent && loadedMB === lastLoadedMB) return
    lastPercent = percent
    lastLoadedMB = loadedMB
    broadcastProgress({ phase: 'downloading', loadedBytes, totalBytes })
  }

  broadcastProgress({ phase: 'preparing' })

  // Dynamically imported so the ~21MB onnxruntime-web WASM runtime and the
  // rest of transformers.js only ever load when on-device mode is actually
  // engaged, not bundled into the default online-translation path.
  const { pipeline } = await import('@huggingface/transformers')
  // device/dtype are pinned: WebGPU's default is fp32 (a ~2.4GB download with
  // brutal session-init time), and its compute is silently unreliable on some
  // GPUs. WASM + q8 is the reliable-everywhere configuration.
  const p = await pipeline('translation', MODEL_ID, {
    device: 'wasm',
    dtype: 'q8',
    progress_callback: (info: ProgressEvent) => {
      if (!info.file) return
      const entry = files.get(info.file) ?? { loaded: 0, total: 0, done: false }
      if (info.status === 'initiate') {
        files.set(info.file, entry)
      } else if (info.status === 'progress') {
        entry.loaded = info.loaded ?? entry.loaded
        entry.total = info.total ?? entry.total
        files.set(info.file, entry)
      } else if (info.status === 'done') {
        entry.done = true
        entry.loaded = entry.total
        files.set(info.file, entry)
      } else {
        return
      }
      emit()
    },
  })
  broadcastProgress({ phase: 'done' })
  setDownloadedModel()
  return p as unknown as TranslationPipeline
}

async function getTranslator(
  onProgress?: (p: ModelLoadProgress) => void,
): Promise<TranslationPipeline> {
  if (translator) return translator
  if (onProgress) progressListeners.add(onProgress)
  try {
    if (!loadingPromise) {
      loadingPromise = loadPipeline().catch((err: unknown) => {
        // Don't cache the rejection — a transient network failure shouldn't
        // brick on-device mode for the rest of the session.
        loadingPromise = null
        throw err
      })
    }
    translator = await loadingPromise
    return translator
  } finally {
    if (onProgress) progressListeners.delete(onProgress)
  }
}

/**
 * Fetch and initialise the model without translating anything.
 *
 * This exists because "Download & enable" used to do neither: it set a
 * localStorage flag and switched the mode, and the ~900MB fetch only ever
 * started inside translate(). With an empty input box the "Translate
 * on-device" button is disabled, so there was no reachable way to trigger it
 * — the button promised a download that could not happen, and nothing on
 * screen said so.
 *
 * It deliberately goes through getTranslator() rather than calling
 * loadPipeline() directly, so it shares the same `loadingPromise` dedupe: a
 * translate issued while the preload is still running joins that download
 * instead of starting a second one.
 */
export async function preloadModel(
  onProgress?: (p: ModelLoadProgress) => void,
): Promise<void> {
  await getTranslator(onProgress)
}

export const onDeviceProvider: TranslationProvider = {
  id: 'ondevice',
  async translate(text, source, target, options?: TranslateOptions) {
    const t = await getTranslator(options?.onModelProgress)
    const out = await t(text, {
      src_lang: source.nllb,
      tgt_lang: target.nllb,
      /* Confirmed on-device on a real phone: with no repetition guard,
       * multi-line input (a several-line Nepali poem) translates the first
       * line or two correctly, then collapses into one short phrase
       * ("There is no one here!") repeated for the rest of the output — the
       * classic greedy-decoding repetition trap, reproducible bit-for-bit
       * since generation here is deterministic.
       *
       * no_repeat_ngram_size alone (a hard ban on repeating any 3-token
       * sequence) stopped the literal loop, but a same-input comparison
       * against this model's own un-penalised output showed why that isn't
       * enough on its own: left alone, the model's way of signalling "I'm
       * running out of confident content" is to start repeating and let
       * that repetition converge into an EOS — outright forbidding repeats
       * removes that off-ramp and pushes generation into inventing
       * unrelated continuations instead, which is what read as "translation
       * is mostly unrelated to the source" once the loop itself was fixed.
       * repetition_penalty is a soft discouragement rather than a hard ban:
       * it still lets the model wind down and hit a natural stopping point,
       * it just makes literal loops increasingly costly, so pure repetition
       * never becomes the cheapest option. no_repeat_ngram_size stays on
       * too, at a default we no longer lean on for the main effect — pure
       * belt-and-suspenders against a verbatim loop slipping through on
       * some input the penalty alone doesn't cover. */
      repetition_penalty: 1.3,
      no_repeat_ngram_size: 3,
    })
    const first = Array.isArray(out) ? out[0] : out
    return first.translation_text
  },
}
