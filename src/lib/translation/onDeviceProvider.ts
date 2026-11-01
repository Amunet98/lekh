import type { TranslationProvider, TranslateOptions, ModelLoadProgress } from './provider'

import { MODEL_ID } from './onDeviceModel'
import { inventedMarkers } from './invented'
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

/* The model lives in a Web Worker (onDevice.worker.ts, 1.9.107); this side
   only talks to it. `ready` once the worker reports the pipeline loaded. */
let ready = false
let loadingPromise: Promise<void> | null = null
let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (v: string) => void; reject: (e: Error) => void }>()
/* Progress events from the worker go to whichever load is listening. */
let onWorkerProgress: ((info: ProgressEvent) => void) | null = null

function getWorker(): Worker {
  if (worker) return worker
  const w = new Worker(new URL('./onDevice.worker.ts', import.meta.url), { type: 'module' })
  w.onmessage = (event: MessageEvent) => {
    const msg = event.data as
      | { type: 'progress'; info: ProgressEvent }
      | { type: 'ready'; id: number }
      | { type: 'result'; id: number; text: string }
      | { type: 'error'; id: number; message: string }
    if (msg.type === 'progress') {
      onWorkerProgress?.(msg.info)
      return
    }
    const job = pending.get(msg.id)
    if (!job) return
    pending.delete(msg.id)
    if (msg.type === 'error') job.reject(new Error(msg.message))
    else job.resolve(msg.type === 'result' ? msg.text : '')
  }
  /* The worker itself failed (its script would not load, or it was killed
     for memory). Everything waiting fails, and the next attempt starts a
     fresh worker and a fresh load rather than talking to a dead one. */
  w.onerror = (event) => {
    event.preventDefault()
    const err = new Error(event.message || 'On-device worker failed')
    for (const job of pending.values()) job.reject(err)
    pending.clear()
    w.terminate()
    worker = null
    ready = false
    loadingPromise = null
  }
  worker = w
  return w
}

function ask(message: Record<string, unknown>): Promise<string> {
  const id = nextId++
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ ...message, id })
  })
}

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

/* How long the byte counter waits for another progress event before deciding
 * the download is over.
 *
 * It has to be able to leave on its own. emit() only ever runs from
 * transformers.js's progress_callback, and the old exit from 'downloading' was
 * gated on allDone — every file having reported a done event. Measured on a
 * phone against a warm cache: the last event the UI ever received said 908 of
 * 912 MB. Four short. One file never reported its final chunk, allDone never
 * became true, nothing arrived to re-run emit(), and the bar sat pinned at 99%
 * for the whole ~75s of ONNX session init until 'done' fired after the
 * pipeline resolved. A frozen bar for over a minute reads as a hang, and the
 * reasonable thing to do with a hung phone app is force-quit it.
 *
 * So a stall ends the download now, rather than a completion signal that may
 * never come. If the numbers have not moved for this long the bytes are as
 * finished as they are going to look, and whatever is still running has no
 * measurable progress — which is what 'preparing' means. Measured on the
 * numbers rather than on the callbacks, deliberately: see armStall() below,
 * where the events keep coming long after they stop saying anything. It also
 * covers the cache hit that fires no progress events at all, which the emit()
 * comment has always known about. */
const STALL_MS = 1200

/* Below this, byte counts are not worth showing and this stays in 'preparing'.
 *
 * It was 1MB, to dodge "0 MB / 0 MB" on the first tick. That is the right idea
 * and the wrong number. transformers.js initiates config and tokenizer before
 * the weights, so with a 1MB floor the first thing a phone actually showed was
 * "Loading model from cache… 15 MB / 17 MB" — a total wrong by fifty times,
 * nearly full — and then the weights initiated, the total became 912MB and the
 * bar dropped to almost nothing before climbing again. Watching a bar fill,
 * reset, and fill again is worse than watching it start late.
 *
 * 100MB is not tuned to this model so much as to the gap: the metadata is tens
 * of MB and any weights file worth drawing a progress bar for is hundreds. A
 * translation model small enough to fall below this would not need the bar. */
const MIN_REPORTABLE_TOTAL = 100e6

async function loadPipeline(): Promise<void> {
  // Files fire per-file initiate/progress/done events; aggregate them into one
  // honest overall byte count. totalBytes grows as later files initiate, so
  // the bar can dip early on — acceptable trade-off for real numbers.
  const files = new Map<string, { loaded: number; total: number; done: boolean }>()
  let lastPercent = -1
  let lastLoadedMB = -1
  let stallTimer: ReturnType<typeof setTimeout> | undefined
  /* Armed on every progress event rather than only on the ones that get
     through the throttle below: events still arriving is exactly what "not
     stalled" means, whether or not they moved a whole percent. */
  const armStall = () => {
    clearTimeout(stallTimer)
    stallTimer = setTimeout(() => broadcastProgress({ phase: 'preparing' }), STALL_MS)
  }

  const emit = () => {
    if (progressListeners.size === 0) return
    let loadedBytes = 0
    let totalBytes = 0
    for (const f of files.values()) {
      loadedBytes += f.loaded
      totalBytes += f.total
    }
    // Nothing worth counting yet — see MIN_REPORTABLE_TOTAL. What is running
    // is real work with no measurable progress, which is 'preparing'.
    if (totalBytes < MIN_REPORTABLE_TOTAL) {
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
    /* Armed here, on a change, and not on every event that arrives.
     *
     * The first version of this armed it in the progress_callback and it never
     * fired once. transformers.js keeps calling back right through session
     * init with the same numbers, so the throttle above suppressed the
     * re-broadcast while each callback pushed the timer forward — and the
     * display froze at 910 of 912 MB for a minute and a half, measured on a
     * phone, exactly as it had before the timer existed. A stall is not "no
     * events". It is "no news". */
    armStall()
    broadcastProgress({ phase: 'downloading', loadedBytes, totalBytes })
  }

  broadcastProgress({ phase: 'preparing' })

  /* The worker does the loading (and imports transformers.js, so the ~21MB
     runtime still only loads when on-device mode is engaged); it forwards
     transformers.js's per-file progress events, aggregated here as before. */
  onWorkerProgress = (info: ProgressEvent) => {
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
  }
  try {
    await ask({ type: 'load' })
  } finally {
    // Whatever happens next, nothing more is loading — a stall broadcast
    // after this point would put a progress bar back on a finished screen.
    onWorkerProgress = null
    clearTimeout(stallTimer)
  }
  broadcastProgress({ phase: 'done' })
  setDownloadedModel()
}

async function getTranslator(onProgress?: (p: ModelLoadProgress) => void): Promise<void> {
  if (ready) return
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
    await loadingPromise
    ready = true
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
    await getTranslator(options?.onModelProgress)
    /* Confirmed on-device on a real phone, twice now, on the actual WASM
     * backend (onnxruntime-web) that production runs on — NOT reproducible
     * on the same model/input via the Node/CPU backend, which stops at a
     * short, reasonably faithful translation on its own. That backend gap
     * means neither fix below can be trusted from a local test alone; both
     * were verified against a live phone run.
     *
     * First failure: with no repetition guard, a several-line Nepali poem
     * translated the first line or two correctly, then collapsed into one
     * short phrase repeated for the rest of the output — the classic
     * greedy-decoding repetition trap, reproducible bit-for-bit since
     * generation here is deterministic.
     *
     * no_repeat_ngram_size alone (a hard ban on repeating any 3-token
     * sequence) stopped that literal loop, but traded it for a second,
     * subtler failure confirmed on the same phone: freed from ever
     * repeating, generation just kept going — past the poem's actual
     * content and into invented, unrelated imagery — because nothing was
     * bounding how much it was allowed to invent. repetition_penalty (a
     * soft discouragement rather than a hard ban) didn't fix that alone
     * either. max_new_tokens is what actually bounds it: scaled off the
     * input's length so a short phrase can't ramble on for paragraphs, but
     * a long document isn't clipped mid-sentence. no_repeat_ngram_size
     * and repetition_penalty both stay on as defense in depth against the
     * literal-loop failure mode within whatever length is now allowed. */
    const maxNewTokens = Math.min(1024, Math.max(64, text.length * 2))
    // Runs in the worker: the page keeps painting "Translating…" meanwhile.
    const generation = {
      src_lang: source.nllb,
      tgt_lang: target.nllb,
      max_new_tokens: maxNewTokens,
      repetition_penalty: 1.3,
      no_repeat_ngram_size: 3,
    }
    const first = await ask({ type: 'translate', text, options: generation })
    /* Invented scripture (see invented.ts): one retry with exactly those
       words banned. Beam search would be the textbook fix, but
       transformers.js 3.8 does not implement it (its generate() has a "TODO:
       Support beam search"). If the retry still has them the page says so;
       it does not pretend the answer is clean. */
    const invented = inventedMarkers(text, first)
    if (invented.length === 0) return first
    const retry = await ask({ type: 'translate', text, options: { ...generation, bad_words: invented } })
    return inventedMarkers(text, retry).length < invented.length ? retry : first
  },
}
