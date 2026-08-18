import { useState } from 'react'
import type { TranslateState } from '../hooks/useTranslateState'
import { recognizeText, looksLikeWrongScript, type OcrLang } from '../lib/ocr/tesseract'
import { FileUpload, type UploadInput } from './FileUpload'
import { DirectionToggle, TranslateControls } from './translate/TranslateControls'
import { TranslationOutput } from './translate/TranslationOutput'
import { TranslateActions } from './translate/TranslateActions'
import { DownloadActions } from './translate/DownloadActions'
import './UploadPage.css'

interface UploadPageProps {
  t: TranslateState
  onEditInTranslate: (text: string) => void
}

type ReadStatus = 'idle' | 'reading' | 'error'

export function UploadPage({ t, onEditInTranslate }: UploadPageProps) {
  const [readStatus, setReadStatus] = useState<ReadStatus>('idle')
  const [readErrorIsOffline, setReadErrorIsOffline] = useState(false)
  const [readLabel, setReadLabel] = useState('Reading text…')
  const [readProgress, setReadProgress] = useState<number | null>(null)
  // Recognized/extracted text is collapsed by default — the translation is
  // the primary output; this stays around (and editable) for OCR-error
  // correction and the Translate handoff.
  const [showRecognized, setShowRecognized] = useState(false)
  // Set when an image's OCR result doesn't look like the expected source
  // script — see looksLikeWrongScript. Kept alongside the input that
  // produced it so "Switch & retry" can redo OCR against the same photo
  // instead of asking for a re-upload.
  const [scriptMismatch, setScriptMismatch] = useState<{ input: UploadInput; expected: OcrLang } | null>(
    null,
  )

  // langOverride exists for the mismatch-retry path: it calls t.setDirectionOnly()
  // and immediately re-runs handleInput, but React state updates aren't visible
  // synchronously — reading t.direction right after would still see the old
  // value. Passing the corrected language explicitly sidesteps that stale read.
  const handleInput = async (input: UploadInput, langOverride?: OcrLang) => {
    setReadStatus('reading')
    setReadProgress(0)
    setScriptMismatch(null)
    // A stale translation of the *previous* upload would otherwise sit on
    // screen through the whole read — and in on-device mode, which only
    // (re)translates on an explicit button press, keep sitting there
    // afterward looking like it already covers the new photo.
    t.clearTranslation()
    const lang = langOverride ?? (t.direction === 'ne-en' ? 'nep' : 'eng')
    try {
      if (input.kind === 'image') {
        setReadLabel('Reading text…')
        const { text, confidence } = await recognizeText(input.canvas, lang, setReadProgress)
        if (looksLikeWrongScript(text, confidence, lang)) {
          setScriptMismatch({ input, expected: lang === 'nep' ? 'eng' : 'nep' })
          setReadStatus('idle')
          return
        }
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
      // The OCR engine and the pdf.js worker are deliberately not part of the
      // install-time precache (see vite.config.ts) — they're ~20MB, fetched
      // and cached on first actual use. A first scan/PDF attempt made before
      // that has ever succeeded once online has nothing to fall back to and
      // fails here, indistinguishable by error shape from a genuinely bad
      // photo — navigator.onLine is what tells them apart. Text/docx never
      // touch that lazy fetch (their code is part of the regular app bundle,
      // already precached), so this only applies to the two extensions that do.
      const usesLazyEngine = input.kind === 'image' || input.file.name.toLowerCase().endsWith('.pdf')
      setReadErrorIsOffline(usesLazyEngine && !navigator.onLine)
      setReadStatus('error')
    } finally {
      setReadProgress(null)
    }
  }

  const retryWithCorrectDirection = () => {
    if (!scriptMismatch) return
    const { input, expected } = scriptMismatch
    t.setDirectionOnly(expected === 'nep' ? 'ne-en' : 'en-ne')
    setScriptMismatch(null)
    void handleInput(input, expected)
  }

  return (
    <section className="upload">
      {/* See the note in TranslatePage — the tab bar is the page title. */}
      <h1 className="sr-only">Upload a photo or document</h1>

      <div className="translate-toolbar">
        <DirectionToggle t={t} />
        <TranslateControls t={t} />
      </div>

      <FileUpload onInput={(input) => void handleInput(input)} />

      {/* A real progress bar rather than a line of text with a percentage in
          it. OCR on a phone can take twenty seconds, and "Reading page 3/9…"
          on its own gives no sense of how much is left. aria-live announces
          the label without the bar itself chattering on every repaint. */}
      {readStatus === 'reading' && (
        <div className="upload-progress" role="status" aria-live="polite">
          <div className="upload-progress__row">
            <span>{readLabel}</span>
            {readProgress !== null && <span>{Math.round(readProgress * 100)}%</span>}
          </div>
          <div className="model-progress-track">
            <div
              className={`model-progress-fill${readProgress === null ? ' model-progress-fill--indeterminate' : ''}`}
              style={readProgress !== null ? { width: `${Math.round(readProgress * 100)}%` } : undefined}
            />
          </div>
        </div>
      )}
      {readStatus === 'error' &&
        (readErrorIsOffline ? (
          <div className="error-banner" role="alert">
            Scanning needs the internet the first time, to download the reader — connect once and it&rsquo;ll
            keep working offline after that.
          </div>
        ) : (
          <div className="error-banner" role="alert">
            Couldn&rsquo;t read that document — try a clearer photo or a different file.
          </div>
        ))}

      {scriptMismatch && (
        <div className="error-banner" role="alert">
          <span>
            This looks like {scriptMismatch.expected === 'nep' ? 'Nepali' : 'English'} text, but the
            direction above is set to translate from {scriptMismatch.expected === 'nep' ? 'English' : 'Nepali'}
            . Reading it that way won&rsquo;t work.
          </span>
          <button type="button" className="btn" onClick={retryWithCorrectDirection}>
            Switch direction &amp; retry
          </button>
        </div>
      )}

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
