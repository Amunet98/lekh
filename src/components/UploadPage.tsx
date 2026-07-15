import { useState } from 'react'
import { useTranslateState } from '../hooks/useTranslateState'
import { recognizeText } from '../lib/ocr/tesseract'
import { FileUpload, type UploadInput } from './FileUpload'
import { DirectionToggle, TranslateControls } from './translate/TranslateControls'
import { TranslationOutput } from './translate/TranslationOutput'
import { TranslateActions } from './translate/TranslateActions'
import { DownloadActions } from './translate/DownloadActions'
import './UploadPage.css'

interface UploadPageProps {
  onEditInTranslate: (text: string) => void
}

type ReadStatus = 'idle' | 'reading' | 'error'

export function UploadPage({ onEditInTranslate }: UploadPageProps) {
  const t = useTranslateState()
  const [readStatus, setReadStatus] = useState<ReadStatus>('idle')
  const [readLabel, setReadLabel] = useState('Reading text…')
  const [readProgress, setReadProgress] = useState<number | null>(null)
  // Recognized/extracted text is collapsed by default — the translation is
  // the primary output; this stays around (and editable) for OCR-error
  // correction and the Translate handoff.
  const [showRecognized, setShowRecognized] = useState(false)

  const handleInput = async (input: UploadInput) => {
    setReadStatus('reading')
    setReadProgress(0)
    const lang = t.direction === 'ne-en' ? 'nep' : 'eng'
    try {
      if (input.kind === 'image') {
        setReadLabel('Reading text…')
        const text = await recognizeText(input.canvas, lang, setReadProgress)
        t.setSourceText(text)
      } else {
        const ext = input.file.name.split('.').pop()?.toLowerCase()
        if (ext === 'txt') {
          setReadLabel('Reading file…')
          t.setSourceText(await input.file.text())
        } else if (ext === 'docx') {
          setReadLabel('Reading document…')
          const { extractDocxText } = await import('../lib/docs/docxInput')
          t.setSourceText(await extractDocxText(input.file))
        } else if (ext === 'pdf') {
          const { extractPdfText } = await import('../lib/docs/pdfInput')
          const text = await extractPdfText(input.file, lang, (p) => {
            setReadLabel(`Reading page ${p.page}/${p.totalPages}…`)
            setReadProgress(p.page / p.totalPages)
          })
          t.setSourceText(text)
        }
      }
      setReadStatus('idle')
    } catch {
      setReadStatus('error')
    } finally {
      setReadProgress(null)
    }
  }

  return (
    <section className="upload">
      <span className="tag">Upload</span>
      <h2>Upload a document — Nepali ⇄ English</h2>

      <DirectionToggle t={t} />

      <FileUpload onInput={(input) => void handleInput(input)} />

      {readStatus === 'reading' && (
        <p className="sugg-hint">
          {readLabel} {readProgress !== null ? `${Math.round(readProgress * 100)}%` : ''}
        </p>
      )}
      {readStatus === 'error' && (
        <div className="error-banner" role="alert">
          Couldn&rsquo;t read that document — try a clearer photo or a different file.
        </div>
      )}

      <TranslateControls t={t} />

      <div className="translate-panes translate-panes--single">
        <TranslationOutput t={t} />
      </div>

      <button
        type="button"
        className="btn upload-toggle"
        onClick={() => setShowRecognized((v) => !v)}
        aria-expanded={showRecognized}
      >
        {showRecognized ? 'Hide recognized text ▾' : 'Show recognized text ▸'}
      </button>

      {showRecognized && (
        <div className="upload-recognized">
          <div className="translate-panes translate-panes--single">
            <textarea
              className="translate-input dev"
              rows={6}
              placeholder="Recognized text appears here — capture a photo, or edit it directly…"
              value={t.sourceText}
              onChange={(e) => t.setSourceText(e.target.value)}
            />
          </div>
          <button type="button" className="btn" onClick={() => onEditInTranslate(t.sourceText)}>
            Edit in Translate →
          </button>
        </div>
      )}

      <TranslateActions t={t} context="upload" />
      <DownloadActions t={t} />
    </section>
  )
}
