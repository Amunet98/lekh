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

export interface RecognizeResult {
  text: string
  confidence: number
}

export async function recognizeText(
  image: HTMLCanvasElement,
  lang: OcrLang,
  onProgress?: (fraction: number) => void,
): Promise<RecognizeResult> {
  const worker = await getWorker(lang, onProgress)
  const { data } = await worker.recognize(image)
  return { text: data.text.trim(), confidence: data.confidence }
}

// Tesseract's language pack decides what glyphs it can even try to match —
// running the English model on a photo of Devanagari text doesn't fail, it
// confidently emits Latin-shaped noise for every glyph it can't place, and
// vice versa. That noise then reads as a bad *translation* with no hint that
// OCR, not the model, is where things actually went wrong.
//
// The two mismatch directions need two different tells. Expecting Devanagari
// but getting almost none of it is unambiguous: the 'nep' pack still passes
// through Latin characters it recognizes fine (numbers, Roman names), so a
// real Nepali document scanned with it is never *this* empty of Devanagari.
// Expecting Latin has no equivalent signal in the output — the 'eng' pack
// cannot emit Devanagari at all, mismatched or not, so there's nothing to
// count. That direction leans on Tesseract's own mean confidence instead,
// which drops hard when it's guessing at glyphs it was never trained on.
export function looksLikeWrongScript(text: string, confidence: number, lang: OcrLang): boolean {
  const letters = text.match(/[ऀ-ॿA-Za-z]/g) ?? []
  if (letters.length < 15) return false // too little recognized text to judge either signal
  if (lang === 'nep') {
    const devanagari = text.match(/[ऀ-ॿ]/g) ?? []
    return devanagari.length / letters.length < 0.15
  }
  return confidence < 45
}
