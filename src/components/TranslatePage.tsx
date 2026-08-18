import { useRef } from 'react'
import type { TranslateState } from '../hooks/useTranslateState'
import { useUploadState, FILE_ACCEPT } from '../hooks/useUploadState'
import { DirectionToggle, TranslateControls } from './translate/TranslateControls'
import { TranslationOutput } from './translate/TranslationOutput'
import { TranslateActions } from './translate/TranslateActions'
import { DownloadActions } from './translate/DownloadActions'
import { SectionIcon } from './SectionIcons'
import './TranslatePage.css'

interface TranslatePageProps {
  t: TranslateState
}

/* Upload used to be its own tab. It reused this page's toolbar, output pane,
 * actions and downloads wholesale — the only things it actually added were a
 * dropzone, OCR/extraction progress, a filename chip, and a script-mismatch
 * retry banner, all layered on the exact same sourceText a typed translation
 * uses. Two tabs for one feature taught people to go looking for "upload"
 * separately from "translate" when they are the same box. Now uploading is
 * just another way to fill in the source pane: a small button that opens the
 * file picker, plus drag-and-drop directly onto the pane — see useUploadState
 * for the mechanics this page hands off to.
 */
export function TranslatePage({ t }: TranslatePageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadState(t, fileInputRef)
  const isEmpty = t.sourceText.length === 0

  return (
    <section className="translate-page">
      {/* Marked up, not drawn. The navigation already says you are in
          Translate, so an eyebrow tag reading "TRANSLATE" above a heading
          reading "Translate text" was the same word three times on one
          screen — but removing the heading outright left the page with no h1
          above the headings inside it. */}
      <h1 className="sr-only">Translate text</h1>

      {/* One toolbar. These were three stacked rows — language pickers, then
          engine, then the panes — which pushed the actual text fields a third
          of the way down the page for two controls most people set once. */}
      <div className="translate-toolbar">
        <DirectionToggle t={t} />
        <TranslateControls t={t} />
      </div>

      <div className="translate-panes">
        <div
          className={`translate-pane${upload.dragging ? ' translate-pane--dragging' : ''}`}
          onDragEnter={upload.onDragEnter}
          onDragOver={upload.onDragOver}
          onDragLeave={upload.onDragLeave}
          onDrop={upload.onDrop}
        >
          <div className="translate-pane__header">
            <label className="translate-pane__label" htmlFor="translate-source">
              {t.sourceLang.label}
            </label>
            <div className="translate-pane__header-actions">
              <button
                type="button"
                className="btn pane-upload-btn"
                title="Upload a photo or document"
                aria-label="Upload a photo or document"
                onClick={upload.openFilePicker}
              >
                <SectionIcon name="upload" size={14} />
                upload
              </button>
              <button type="button" className="btn" disabled={isEmpty} onClick={upload.clearUpload}>
                clear
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            hidden
            onChange={upload.handleFileInputChange}
          />

          {upload.currentFile && (
            <div className="upload-current">
              <span className="upload-current__name">{upload.currentFile}</span>
              <button type="button" className="btn" onClick={upload.clearUpload}>
                remove
              </button>
            </div>
          )}

          {/* A real progress bar rather than a line of text with a percentage
              in it. OCR on a phone can take twenty seconds, and "Reading page
              3/9…" on its own gives no sense of how much is left. aria-live
              announces the label without the bar itself chattering on every
              repaint. */}
          {upload.readStatus === 'reading' && (
            <div className="upload-progress" role="status" aria-live="polite">
              {upload.largeFileWarning && (
                <p className="sugg-hint">Large file — this may take a while.</p>
              )}
              <div className="upload-progress__row">
                <span>{upload.readLabel}</span>
                {upload.readProgress !== null && <span>{Math.round(upload.readProgress * 100)}%</span>}
              </div>
              <div className="model-progress-track">
                <div
                  className={`model-progress-fill${upload.readProgress === null ? ' model-progress-fill--indeterminate' : ''}`}
                  style={
                    upload.readProgress !== null
                      ? { width: `${Math.round(upload.readProgress * 100)}%` }
                      : undefined
                  }
                />
              </div>
            </div>
          )}
          {upload.unsupportedExt && (
            <div className="error-banner" role="alert">
              {`".${upload.unsupportedExt}" isn't a supported format — use an image, .pdf, .docx, or .txt file.`}
            </div>
          )}
          {upload.readStatus === 'error' &&
            (upload.readErrorIsOffline ? (
              <div className="error-banner" role="alert">
                Scanning needs the internet the first time, to download the reader — connect once and
                it&rsquo;ll keep working offline after that.
              </div>
            ) : (
              <div className="error-banner" role="alert">
                Couldn&rsquo;t read that document — try a clearer photo or a different file.
              </div>
            ))}
          {upload.scriptMismatch && (
            <div className="error-banner" role="alert">
              <span>
                This looks like {upload.scriptMismatch.expected === 'nep' ? 'Nepali' : 'English'} text,
                but the direction above is set to translate from{' '}
                {upload.scriptMismatch.expected === 'nep' ? 'English' : 'Nepali'}. Reading it that way
                won&rsquo;t work.
              </span>
              <button type="button" className="btn" onClick={upload.retryWithCorrectDirection}>
                Switch direction &amp; retry
              </button>
            </div>
          )}

          <textarea
            id="translate-source"
            className="translate-input dev"
            rows={6}
            placeholder="Type English or Nepali (or romanized Nepali like 'mero naam')… or drop a photo, PDF, DOCX or TXT"
            value={t.sourceText}
            onChange={(e) => t.setSourceText(e.target.value)}
          />
        </div>
        <div className="translate-pane">
          <span className="translate-pane__label">{t.targetLang.label}</span>
          <TranslationOutput t={t} />
        </div>
      </div>

      <TranslateActions t={t} />
      <DownloadActions t={t} />
    </section>
  )
}
