import type { OcrLang } from '../ocr/tesseract'

export interface PdfProgress {
  page: number
  totalPages: number
}

// Lazy-imported so the pdf.js bundle only loads when a PDF is actually
// opened. Worker self-hosted per repo convention (see public/tesseract) —
// no CDN at runtime.
async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
  return pdfjs
}

export async function extractPdfText(
  file: File,
  lang: OcrLang,
  onProgress?: (p: PdfProgress) => void,
): Promise<string> {
  const pdfjs = await loadPdfjs()
  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.({ page: i, totalPages: doc.numPages })
    const page = await doc.getPage(i)
    const textContent = await page.getTextContent()
    const text = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()

    if (text) {
      // Born-digital page — exact text layer, no OCR needed.
      pages.push(text)
      continue
    }

    // No text layer (a scanned/rasterized page) — render it to canvas and
    // run it through the same OCR path the camera capture uses.
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    await page.render({ canvas, canvasContext: ctx, viewport }).promise
    const { recognizeText } = await import('../ocr/tesseract')
    pages.push(await recognizeText(canvas, lang))
  }

  return pages.join('\n\n')
}
