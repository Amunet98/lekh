/// <reference lib="webworker" />

/* The on-device model, off the main thread (1.9.107).
 *
 * transformers.js on the WASM backend computes on whichever thread calls it.
 * It used to be the page's, so while NLLB ran the whole app froze: the first
 * translation still showed its progress (downloading and loading the model
 * awaits, so the screen got painted), but every later one started computing
 * at once and nothing could repaint until it finished. No "Translating…", taps
 * ignored, and to the owner (and any new user) it looked like a crash
 * (reported on the A024, 2026-11-02). In here it can take as long as it takes
 * and the page stays live.
 *
 * Protocol: { id, type: 'load' } → { id, type: 'ready' }
 *           { id, type: 'translate', text, options } → { id, type: 'result', text }
 *           any failure → { id, type: 'error', message }
 *           while loading: { type: 'progress', info } (forwarded as is; the page
 *           aggregates it, see onDeviceProvider.ts). */

import { MODEL_ID } from './onDeviceModel'

type TranslateOptions = {
  src_lang: string
  tgt_lang: string
  max_new_tokens: number
  repetition_penalty: number
  no_repeat_ngram_size: number
}
type Request =
  | { id: number; type: 'load' }
  | { id: number; type: 'translate'; text: string; options: TranslateOptions }
type Pipeline = (
  text: string,
  options: TranslateOptions,
) => Promise<Array<{ translation_text: string }> | { translation_text: string }>

const scope = self as unknown as DedicatedWorkerGlobalScope
let loading: Promise<Pipeline> | null = null

function load(): Promise<Pipeline> {
  loading ??= (async () => {
    const { pipeline } = await import('@huggingface/transformers')
    // Pinned: WebGPU's default is fp32 (~2.4GB) and unreliable on some GPUs.
    const p = await pipeline('translation', MODEL_ID, {
      device: 'wasm',
      dtype: 'q8',
      progress_callback: (info: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (!info.file) return
        scope.postMessage({
          type: 'progress',
          info: { status: info.status, file: info.file, loaded: info.loaded, total: info.total },
        })
      },
    })
    return p as unknown as Pipeline
  })().catch((err: unknown) => {
    // Not cached: a dropped connection must not brick on-device mode.
    loading = null
    throw err
  })
  return loading
}

scope.onmessage = async (event: MessageEvent<Request>) => {
  const msg = event.data
  try {
    const translate = await load()
    if (msg.type === 'load') {
      scope.postMessage({ id: msg.id, type: 'ready' })
      return
    }
    const out = await translate(msg.text, msg.options)
    const first = Array.isArray(out) ? out[0] : out
    scope.postMessage({ id: msg.id, type: 'result', text: first.translation_text })
  } catch (err) {
    scope.postMessage({ id: msg.id, type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
