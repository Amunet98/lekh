import * as Tesseract from 'tesseract.js'

// Self-hosted per site convention (no CDN at runtime) — see public/tesseract
// and public/tessdata. The core variant is SIMD+LSTM-only, so OEM is pinned
// to LSTM_ONLY to match; the legacy engine isn't present in this wasm build.
const WORKER_PATH = '/tesseract/worker.min.js'
const CORE_PATH = '/tesseract/tesseract-core-simd-lstm.wasm.js'
const LANG_PATH = '/tessdata'

export type OcrLang = 'nep' | 'eng'

let workerPromise: Promise<Tesseract.Worker> | null = null
let loadedLang: OcrLang | null = null

async function getWorker(lang: OcrLang, onProgress?: (fraction: number) => void): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    loadedLang = lang
    workerPromise = Tesseract.createWorker(lang, Tesseract.OEM.LSTM_ONLY, {
      workerPath: WORKER_PATH,
      corePath: CORE_PATH,
      langPath: LANG_PATH,
      gzip: true,
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress(m.progress)
        }
      },
    })
    return workerPromise
  }

  const worker = await workerPromise
  if (loadedLang !== lang) {
    await worker.reinitialize(lang)
    loadedLang = lang
  }
  return worker
}

export async function recognizeText(
  image: HTMLCanvasElement,
  lang: OcrLang,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const worker = await getWorker(lang, onProgress)
  const { data } = await worker.recognize(image)
  return data.text.trim()
}
