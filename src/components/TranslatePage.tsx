import { useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { TranslateState } from '../hooks/useTranslateState'
import { useUploadState, FILE_ACCEPT } from '../hooks/useUploadState'
import { DirectionToggle } from './translate/TranslateControls'
import { TranslationOutput } from './translate/TranslationOutput'
import { fill } from './translate/progressFill'
import { TranslateRun } from './translate/TranslateRun'
import { useOnline } from '../hooks/useOnline'
import { SectionIcon } from './SectionIcons'
import { SheetIcon } from './SheetIcons'
import { useToast } from '../hooks/useToast'
import { tick } from '../lib/haptics'
import { PASTE_AVAILABLE, readClipboardText } from '../lib/clipboard'
import { looksLikeEnglish, looksLikeRomanNepali } from '../lib/translation/romanNepali'
import './TranslatePage.css'

interface TranslatePageProps {
  t: TranslateState
  /** Opens the translation full-screen — see ShowScreen. */
  onShow: () => void
}

// Not in SectionIcon — that set is deliberately scoped to nav destinations
// (see its own header comment), and a camera has no destination of its own.
function CameraIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8h3l2-2h6l2 2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
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
/* Clear and Undo share one slot, and the two words are different widths at
   every text size — so whichever is shown, the other is laid in the same grid
   cell invisibly and the button is always as wide as the wider of them. With
   only the shown word, the swap moved the text box: "Undo" is narrower than
   "Clear" at 360px / Large, and the row came back up beside the label, 32px,
   then went down again six seconds later. Measured, 2026-11-01. */
function ClearLabel({ shown }: { shown: 'Clear' | 'Undo' }) {
  const other = shown === 'Clear' ? 'Undo' : 'Clear'
  return (
    <span className="pane-clear-btn__label">
      <span aria-hidden={shown === 'Undo' ? true : undefined}>{shown}</span>
      <span className="pane-clear-btn__ghost" aria-hidden="true">
        {other}
      </span>
    </span>
  )
}

export function TranslatePage({ t, onShow }: TranslatePageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadState(t, fileInputRef)
  const online = useOnline()
  const isEmpty = t.sourceText.length === 0
  /* Option B of the 2026-11-02 distill (1.9.91): while the box is empty its
     foot is three labelled tiles, the ways in; once there is text they go and
     the answer appears. The answer pane is not drawn over an empty box at all,
     so the first screen is one box and its tools. */
  const showTiles = isEmpty && !upload.currentFile && upload.readStatus !== 'reading'
  const showAnswer = !isEmpty || t.translated !== '' || t.status === 'loading'
  const toast = useToast()

  /* Paste into the source box, at the caret, as a long-press paste would —
     the usual reason to open Translate is a message someone sent, and that
     was a long-press away. Same clipboard route as the Type editor (see
     lib/clipboard.ts: the APK's WebView refuses readText, so the app reads
     through the native plugin). No conversion runs on this box, so the caret
     goes straight after the pasted text; flushSync so React has written the
     value before it is placed (see Editor.tsx for the race this avoids). */
  const pasteSource = async () => {
    const el = document.getElementById('translate-source') as HTMLTextAreaElement | null
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    let clip: string
    try {
      clip = await readClipboardText()
    } catch {
      toast.problem('Could not read the clipboard')
      return
    }
    if (!clip) {
      toast.problem('Nothing to paste')
      return
    }
    tick()
    const text = t.sourceText
    el.focus()
    flushSync(() => t.setSourceText(text.slice(0, start) + clip + text.slice(end)))
    el.setSelectionRange(start + clip.length, start + clip.length)
  }

  /* Nepali typed in English letters while the direction says English: the
     translator would only respell it (मलाइ ढेरै भोक लग्यो), so offer the
     direction that reads it as Nepali. "It's English" hides the offer until
     the box is emptied — adjusted during render, not in an effect, since it
     only ever follows the text. */
  const [romanDismissed, setRomanDismissed] = useState(false)
  if (isEmpty && romanDismissed) setRomanDismissed(false)
  const romanNepali = useMemo(
    () => t.direction === 'en-ne' && looksLikeRomanNepali(t.sourceText),
    [t.direction, t.sourceText],
  )
  /* And the mirror case: English typed while the direction says Nepali, which
     the romanizer turns into Devanagari nonsense before the translator sees
     it. Its own dismissal, so declining one offer never hides the other. */
  const [englishDismissed, setEnglishDismissed] = useState(false)
  if (isEmpty && englishDismissed) setEnglishDismissed(false)
  const english = useMemo(
    () => t.direction === 'ne-en' && looksLikeEnglish(t.sourceText),
    [t.direction, t.sourceText],
  )

  return (
    <section className="translate-page">
      {/* Marked up, not drawn. The navigation already says you are in
          Translate, so an eyebrow tag reading "TRANSLATE" above a heading
          reading "Translate text" was the same word three times on one
          screen — but removing the heading outright left the page with no h1
          above the headings inside it. */}
      <h1 className="sr-only">Translate text</h1>

      {/* The language row, and nothing else.
          It was three stacked rows once — pickers, then engine, then the panes
          — then two. The engine segment has moved to Settings (see
          EngineStatus): it is a setting set once or never, and at full width
          on a phone it was the second-loudest thing on a screen whose job is
          to show you a translation. What is left is the one control that
          changes per use. The "Online translation · Change" line that
          replaced it under the answer went too (1.9.90): Settings has the
          choice, and the offline and error banners below still offer
          on-device at the one moment it matters. */}
      <div className="translate-toolbar">
        <DirectionToggle t={t} />
      </div>

      {/* Right under the toolbar, not at the foot of the page below both
          panes. A phone screen doesn't show the bottom of the page without
          scrolling — buried there, an offline message would go unread. */}
      {/* Said before the attempt, not after it. Online mode's debounced
          request would otherwise fail on its own and report a service being
          unavailable, which names the wrong problem — the service is fine,
          the device is not on a network. On-device mode is unaffected and
          says so, because that is the entire reason it exists. */}
      {!online && t.mode === 'online' && (
        <div className="error-banner" role="status">
          <span>
            You’re offline — online translation needs a connection. Typing and{' '}
            <span className="dev">पात्रो</span> still work.
          </span>
          {t.deviceMemoryTier !== 'low' && (
            <button type="button" className="btn" onClick={t.requestOnDevice}>
              Switch to on-device
            </button>
          )}
        </div>
      )}

      {t.error && (
        <div className="error-banner" role="alert">
          <span>{t.error}</span>
          {t.mode === 'online' && t.deviceMemoryTier !== 'low' && (
            <button type="button" className="btn" onClick={t.requestOnDevice}>
              Switch to on-device
            </button>
          )}
        </div>
      )}

      <div className={`translate-panes${showAnswer ? '' : ' translate-panes--single'}`}>
        <div
          className={`translate-pane translate-pane--source${showAnswer ? '' : ' translate-pane--alone'}${upload.dragging ? ' translate-pane--dragging' : ''}${
            upload.readStatus === 'reading' ? ' translate-pane--reading' : ''
          }`}
          onDragEnter={upload.onDragEnter}
          onDragOver={upload.onDragOver}
          onDragLeave={upload.onDragLeave}
          onDrop={upload.onDrop}
        >
          {/* No visible pane name since 1.9.90. The language row directly
              above already says which side is which, and a label on each
              pane plus the hint inside it was each language named three
              times on one screen (owner: "cluttered", option A of the
              2026-11-02 distill). Screen readers still get a name. */}
          <label className="sr-only" htmlFor="translate-source">
            {`${t.sourceLang.label} text`}
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept={FILE_ACCEPT}
            hidden
            onChange={upload.handleFileInputChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={upload.handleFileInputChange}
          />

          {upload.currentFile && (
            <div className="upload-current">
              {upload.currentThumbnail && (
                <img className="upload-current__thumb" src={upload.currentThumbnail} alt="" />
              )}
              <span className="upload-current__name">{upload.currentFile}</span>
              <button type="button" className="btn" onClick={upload.clearUpload}>
                Remove
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
                  style={upload.readProgress !== null ? fill(upload.readProgress) : undefined}
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

          {/* The box is the wrapper, not the textarea: it holds the text and,
              along its foot, the ways to fill or empty it. They were four
              pills in a header row above an empty field (Upload · Scan ·
              Paste · a greyed-out Clear), the loudest thing on the screen
              before anything had been typed. */}
          <div className="translate-input-wrap">
            <textarea
              id="translate-source"
              className="translate-input dev"
              rows={6}
              aria-describedby={isEmpty ? 'translate-source-hint' : undefined}
              value={t.sourceText}
              onChange={(e) => t.setSourceText(e.target.value)}
              onPaste={upload.handlePaste}
            />
            {/* The direction suggestions, under the text inside the box (see
                .hint-banner--float in TranslatePage.css for why they no
                longer float over it). */}
            {romanNepali && !romanDismissed && (
              <div className="hint-banner hint-banner--float" role="status">
                <span>This looks like Nepali typed in English letters.</span>
                <span className="hint-banner__actions">
                  <button type="button" className="btn btn--primary" onClick={() => t.setDirectionOnly('ne-en')}>
                    Translate from Nepali
                  </button>
                  <button type="button" className="btn" onClick={() => setRomanDismissed(true)}>
                    It&rsquo;s English
                  </button>
                </span>
              </div>
            )}
            {english && !englishDismissed && (
              <div className="hint-banner hint-banner--float" role="status">
                <span>This looks like English, but the direction is Nepali → English.</span>
                <span className="hint-banner__actions">
                  <button type="button" className="btn btn--primary" onClick={() => t.setDirectionOnly('en-ne')}>
                    Translate from English
                  </button>
                  <button type="button" className="btn" onClick={() => setEnglishDismissed(true)}>
                    It&rsquo;s Nepali
                  </button>
                </span>
              </div>
            )}
            {/* Shown only over the truly empty, idle box, and set where the
                text will start so it reads as the field's own placeholder.
                One sentence and its gloss: the tools along the foot say the
                rest, so the old "or upload a file or scan a page" line, which
                described two buttons already on screen, is gone. Desktop
                keeps one clause about dropping a file, the one way in that
                has no button. pointer-events: none lets a tap land on the
                textarea underneath. */}
            {isEmpty &&
              !upload.currentFile &&
              upload.readStatus === 'idle' &&
              !upload.dragging && (
                <div className="upload-hint" id="translate-source-hint">
                  <p className="upload-hint__type">Type English or Nepali</p>
                  <p className="upload-hint__sub">
                    Romanized works too, like &lsquo;mero naam&rsquo;
                    <span className="upload-hint__fine">. Or drop a photo or document here.</span>
                  </p>
                </div>
              )}
            {/* For six seconds after a clear the box offers it back, as the
                editor does. It sits above the tiles here, since the cleared
                box is showing them. */}
            {!upload.currentFile && t.lastClearedSource !== null && (
              <div className="translate-tools translate-tools--undo">
                <button
                  type="button"
                  className="btn pane-clear-btn"
                  aria-label="Undo clear"
                  onClick={t.undoClearSource}
                >
                  <SheetIcon name="undo" size={16} />
                  <ClearLabel shown="Undo" />
                </button>
              </div>
            )}
            {showTiles ? (
              <div className="translate-tiles">
                {/* Paste at the caret, as a long-press paste would. */}
                {PASTE_AVAILABLE && (
                  <button type="button" className="translate-tile" onClick={() => void pasteSource()}>
                    <SheetIcon name="paste" size={20} />
                    Paste
                  </button>
                )}
                {/* A second, capture-mode input: most phones offer the camera
                    inside the file picker already, this skips that tap. Touch
                    devices only (see .translate-tile--scan): a desktop browser
                    ignores `capture` and it would be a second Upload. */}
                <button
                  type="button"
                  className="translate-tile translate-tile--scan"
                  aria-label="Scan a page with the camera"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <CameraIcon size={20} />
                  <span aria-hidden="true">Scan</span>
                </button>
                <button
                  type="button"
                  className="translate-tile"
                  aria-label="Upload a photo or document"
                  onClick={upload.openFilePicker}
                >
                  <SectionIcon name="upload" size={20} />
                  <span aria-hidden="true">Upload</span>
                </button>
              </div>
            ) : (
              /* With text in the box, only Clear: replacing it with a paste or
                 a scan is Clear first (or a long-press paste). Hidden while a
                 file is loaded, since the chip's Remove is the same action. */
              !isEmpty &&
              !upload.currentFile && (
                <div className="translate-tools">
                  <button type="button" className="btn pane-clear-btn" onClick={upload.clearUpload}>
                    <SheetIcon name="trash" size={16} />
                    <ClearLabel shown="Clear" />
                  </button>
                </div>
              )
            )}
          </div>
        </div>
        {showAnswer && <TranslateRun t={t} />}
        {/* The answer on its own ground, with what you can do with it inside
            the same box. No visible name: the language row says it. */}
        {showAnswer && (
          <div className="translate-pane translate-pane--target reveal">
            <span className="sr-only">{`${t.targetLang.label} translation`}</span>
            <TranslationOutput t={t} onShow={onShow} />
          </div>
        )}
      </div>
    </section>
  )
}
