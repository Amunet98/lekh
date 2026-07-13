import type { TranslationProvider, TranslateOptions } from './provider'

const MODEL_ID = 'Xenova/nllb-200-distilled-600M'
const CONFIRM_KEY = 'lekh:ondevice-model-confirmed'

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
}

type TranslationPipeline = (
  text: string,
  options: { src_lang: string; tgt_lang: string },
) => Promise<Array<{ translation_text: string }> | { translation_text: string }>

let translator: TranslationPipeline | null = null
let loadingPromise: Promise<TranslationPipeline> | null = null
let currentDevice: 'webgpu' | 'wasm' = 'webgpu'

async function loadPipeline(
  device: 'webgpu' | 'wasm',
  onProgress?: (fraction: number) => void,
): Promise<TranslationPipeline> {
  // Dynamically imported so the ~21MB onnxruntime-web WASM runtime and the
  // rest of transformers.js only ever load when on-device mode is actually
  // engaged, not bundled into the default online-translation path.
  const { pipeline } = await import('@huggingface/transformers')
  const p = await pipeline('translation', MODEL_ID, {
    device,
    progress_callback: (info: { status: string; progress?: number }) => {
      if (onProgress && info.status === 'progress' && typeof info.progress === 'number') {
        onProgress(info.progress / 100)
      }
    },
  })
  return p as unknown as TranslationPipeline
}

async function getTranslator(onProgress?: (fraction: number) => void): Promise<TranslationPipeline> {
  if (translator) return translator
  if (!loadingPromise) {
    currentDevice = typeof navigator !== 'undefined' && 'gpu' in navigator ? 'webgpu' : 'wasm'
    loadingPromise = loadPipeline(currentDevice, onProgress).catch(async (err) => {
      if (currentDevice === 'webgpu') {
        currentDevice = 'wasm'
        return loadPipeline('wasm', onProgress)
      }
      throw err
    })
  }
  translator = await loadingPromise
  return translator
}

function resetPipeline() {
  translator = null
  loadingPromise = null
}

export function getCurrentDevice(): 'webgpu' | 'wasm' {
  return currentDevice
}

export const onDeviceProvider: TranslationProvider = {
  id: 'ondevice',
  async translate(text, source, target, options?: TranslateOptions) {
    let t = await getTranslator(options?.onProgress)
    try {
      const out = await t(text, { src_lang: source.nllb, tgt_lang: target.nllb })
      const first = Array.isArray(out) ? out[0] : out
      return first.translation_text
    } catch (err) {
      // A broken WebGPU compute path (garbled output or a hard crash) is a
      // known failure mode on some GPUs Chrome doesn't fully validate — retry
      // once on WASM before surfacing the error to the caller.
      if (currentDevice === 'webgpu') {
        resetPipeline()
        currentDevice = 'wasm'
        t = await getTranslator(options?.onProgress)
        const out = await t(text, { src_lang: source.nllb, tgt_lang: target.nllb })
        const first = Array.isArray(out) ? out[0] : out
        return first.translation_text
      }
      throw err
    }
  },
}
