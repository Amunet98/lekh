import { useEffect, useRef, useState } from 'react'
import type { TranslateState } from '../../hooks/useTranslateState'
import { saveFile } from '../../lib/download'
import { printPage } from '../../lib/print'
import { isNativeApp } from '../../lib/androidApp'
import { useToast } from '../../hooks/useToast'
import './DownloadActions.css'

type Format = 'txt' | 'docx' | 'pdf'

const FORMATS: { id: Format; label: string; hint: string }[] = [
  { id: 'txt', label: '.txt', hint: 'Plain text' },
  { id: 'docx', label: '.docx', hint: 'Word document' },
  { id: 'pdf', label: 'PDF', hint: 'Via your device’s print dialog' },
]

export function DownloadActions({ t }: { t: TranslateState }) {
  const toast = useToast()
  const printSheetRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const enabled = t.translated.trim().length > 0

  const downloadTxt = async () => {
    await saveFile(
      new Blob([t.translated], { type: 'text/plain' }),
      'lekh-translation.txt',
    )
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
      await saveFile(await Packer.toBlob(doc), 'lekh-translation.docx')
    } finally {
      setBusy(false)
    }
  }

  const printPdf = () => {
    // jsPDF/pdf-lib can't shape Devanagari text — the browser's own print
    // engine is the only correct client-side path, so "Save as PDF" hands
    // off to window.print() with a print-only sheet (see @media print CSS).
    if (printSheetRef.current) printSheetRef.current.textContent = t.translated
    // Not window.print() directly — the Android WebView has none. See print.ts.
    printPage('lekh-translation')
  }

  // A menu, not a <select>. The native control was the one thing on the page
  // the browser drew for us — it ignored the pill language every other control
  // speaks, and it was being abused as a menu anyway (a "Download ▾" option
  // that is not a value, reset to '' on every change so re-picking the same
  // format fires again). Same disclosure pattern as LangPicker in
  // TranslateControls: outside-click and Escape both close it.
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Dispatch by id rather than storing the handlers in the list. FORMATS is
  // module-level, inert data; building it here with `run:` closures meant an
  // array constructed *during render* held a function that reads
  // printSheetRef — which react-hooks/refs correctly rejects.
  /* Success is only worth announcing on the web, where a download can finish
     entirely out of sight — in a standalone PWA window there is no download
     bar to notice. In the app the system share sheet has already appeared over
     the page, and a toast confirming what the user can see is noise. Failure
     is announced in both, because in both it is otherwise silent. */
  const run = (id: Format) => {
    if (id === 'pdf') {
      printPdf()
      return
    }
    const filename = id === 'txt' ? 'lekh-translation.txt' : 'lekh-translation.docx'
    void (id === 'txt' ? downloadTxt() : downloadDocx())
      .then(() => {
        if (!isNativeApp()) toast.done(`Saved ${filename}`)
      })
      .catch(() => toast.problem(`Could not save ${filename}`))
  }

  return (
    <div className="download-actions" ref={wrapRef}>
      <div className="download-menu">
        <button
          type="button"
          className="mode-btn download-menu__btn"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={!enabled || busy}
          onClick={() => setOpen((v) => !v)}
        >
          {busy ? 'Preparing…' : 'Download'}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {open && (
          <div className="download-menu__menu" role="menu" aria-label="Download translation as">
            {FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="menuitem"
                className="download-menu__item"
                onClick={() => {
                  setOpen(false)
                  run(f.id)
                }}
              >
                <span className="download-menu__label">{f.label}</span>
                <span className="download-menu__hint">{f.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div id="print-sheet" ref={printSheetRef} className="print-sheet" />
    </div>
  )
}
