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

type TranslationPipeline = (
  text: string,
  options: { src_lang: string; tgt_lang: string },
) => Promise<Array<{ translation_text: string }> | { translation_text: string }>

let translator: TranslationPipeline | null = null
let loadingPromise: Promise<TranslationPipeline> | null = null

interface ProgressEvent {
  status: string
  file?: string
  loaded?: number
  total?: number
}

async function loadPipeline(
  onProgress?: (p: ModelLoadProgress) => void,
): Promise<TranslationPipeline> {
  // Files fire per-file initiate/progress/done events; aggregate them into one
  // honest overall byte count. totalBytes grows as later files initiate, so
  // the bar can dip early on — acceptable trade-off for real numbers.
  const files = new Map<string, { loaded: number; total: number; done: boolean }>()
  let lastPercent = -1
  let lastLoadedMB = -1

  const emit = () => {
    if (!onProgress) return
    let loadedBytes = 0
    let totalBytes = 0
    let allDone = files.size > 0
    for (const f of files.values()) {
      loadedBytes += f.loaded
      totalBytes += f.total
      if (!f.done) allDone = false
    }
    if (allDone || totalBytes === 0) {
      // Every fetched file is complete (or nothing is streaming, e.g. a
      // Firefox cache hit fires no progress events) — the remaining wait is
      // ONNX session init, which has no measurable progress.
      onProgress({ phase: 'preparing' })
      return
    }
    // Throttle: transformers.js fires per-chunk; only re-render on a visible
    // change (integer percent or whole MB).
    const percent = Math.floor((loadedBytes / totalBytes) * 100)
    const loadedMB = Math.floor(loadedBytes / 1e6)
    if (percent === lastPercent && loadedMB === lastLoadedMB) return
    lastPercent = percent
    lastLoadedMB = loadedMB
    onProgress({ phase: 'downloading', loadedBytes, totalBytes })
  }

  onProgress?.({ phase: 'preparing' })

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
  onProgress?.({ phase: 'done' })
  setDownloadedModel()
  return p as unknown as TranslationPipeline
}

async function getTranslator(
  onProgress?: (p: ModelLoadProgress) => void,
): Promise<TranslationPipeline> {
  if (translator) return translator
  if (!loadingPromise) {
    loadingPromise = loadPipeline(onProgress).catch((err: unknown) => {
      // Don't cache the rejection — a transient network failure shouldn't
      // brick on-device mode for the rest of the session.
      loadingPromise = null
      throw err
    })
  }
  translator = await loadingPromise
  return translator
}

export const onDeviceProvider: TranslationProvider = {
  id: 'ondevice',
  async translate(text, source, target, options?: TranslateOptions) {
    const t = await getTranslator(options?.onModelProgress)
    const out = await t(text, { src_lang: source.nllb, tgt_lang: target.nllb })
    const first = Array.isArray(out) ? out[0] : out
    return first.translation_text
  },
}
