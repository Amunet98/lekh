import { useRef, useState } from 'react'
import type { TranslateState } from '../../hooks/useTranslateState'
import './DownloadActions.css'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function DownloadActions({ t }: { t: TranslateState }) {
  const printSheetRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const enabled = t.translated.trim().length > 0

  const downloadTxt = () => {
    downloadBlob(new Blob([t.translated], { type: 'text/plain' }), 'lekh-translation.txt')
  }

  const downloadDocx = async () => {
    setBusy(true)
    try {
      // Lazy-imported — this ~500KB lib only loads when a .docx is actually
      // requested. Word (and thus this lib) shapes Devanagari correctly at
      // render time, unlike client-side PDF libs — see printPdf below.
      const { Document, Packer, Paragraph } = await import('docx')
      const doc = new Document({
        sections: [{ children: t.translated.split('\n').map((line) => new Paragraph(line)) }],
      })
      downloadBlob(await Packer.toBlob(doc), 'lekh-translation.docx')
    } finally {
      setBusy(false)
    }
  }

  const printPdf = () => {
    // jsPDF/pdf-lib can't shape Devanagari text — the browser's own print
    // engine is the only correct client-side path, so "Save as PDF" hands
    // off to window.print() with a print-only sheet (see @media print CSS).
    if (printSheetRef.current) printSheetRef.current.textContent = t.translated
    window.print()
  }

  return (
    <div className="download-actions">
      <button type="button" className="btn" onClick={downloadTxt} disabled={!enabled}>
        Download .txt
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => void downloadDocx()}
        disabled={!enabled || busy}
      >
        Download .docx
      </button>
      <button type="button" className="btn" onClick={printPdf} disabled={!enabled}>
        Save as PDF
      </button>
      <div id="print-sheet" ref={printSheetRef} className="print-sheet" />
    </div>
  )
}
