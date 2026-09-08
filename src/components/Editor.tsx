import { useState, type RefObject } from 'react'
import type { EditorState } from '../hooks/useEditorState'
import { SAMPLES } from '../data/samples'
import { SHARE_AVAILABLE } from '../lib/share'
import { tick } from '../lib/haptics'
import { useToast } from '../hooks/useToast'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { DOCK_QUERY } from '../hooks/useDockDetached'
import { DOWNLOAD_FORMATS, useDownloadActions } from '../hooks/useDownloadActions'
import { DownloadActions } from './DownloadActions'
import { ActionSheet, type ActionSheetOption } from './ActionSheet'
import './Editor.css'

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

/* Exported so App can hand the caret over when the boot screen leaves without
   threading a ref up through TypePage. The ref below is the in-component
   route and stays the one this file uses; this id is purely the outside
   world's handle on the same element. */
export const EDITOR_ID = 'lekh-editor'

/* Four, not the full eleven. The old "TRY ONE" block ran ten chips over three
   wrapped rows and was permanent — it sat under the editor whether you had
   written a thousand words or nothing at all. Four is enough to show what the
   app does, and they now appear only while the editor is empty (see below).
   The rest of SAMPLES stays in the data file; the order there is a
   progression, so the first four are the introduction. */
const STARTER_SAMPLES = SAMPLES.slice(0, 4)

interface EditorProps {
  editor: EditorState
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onOpenCheatSheet: () => void
}

export function Editor({ editor, textareaRef, onOpenCheatSheet }: EditorProps) {
  const toast = useToast()
  const isEmpty = editor.text.length === 0
  const wordCount = editor.text.trim() === '' ? 0 : editor.text.trim().split(/\s+/).length

  /* Eight controls do not fit one row on a phone.
   *
   * EN/नेपाली, कख, copy, share, Download, clear and the count were a wrapping
   * flex row, and at 390px it wrapped — leaving `clear` and the word count
   * stranded on a second line and pushing the editor up by a row for the
   * privilege. So below the dock breakpoint the row keeps what is used most
   * (the mode, the cheat sheet, copy) and everything else moves behind one
   * overflow control.
   *
   * Flattened rather than nested: the sheet lists the three formats directly
   * instead of a "Download" row that opens a second sheet on top of the
   * first. That is what useDownloadActions was pulled out of DownloadActions
   * for — the desktop row still renders the pill-with-a-menu, this renders
   * rows, and both dispatch through the same run(). */
  const compactActions = useMediaQuery(DOCK_QUERY)
  const [moreOpen, setMoreOpen] = useState(false)
  const { busy, run, printSheetRef } = useDownloadActions({
    text: editor.text,
    filenameBase: 'lekh-nepali',
  })

  const share = () => {
    /* A share that fails has nowhere to say so — the sheet simply never
       appears and the tap looks ignored. Dismissing it is not a failure and
       never reaches here (see share.ts). */
    void editor.share().catch(() => toast.problem('Could not open the share sheet'))
  }
  const clear = () => {
    editor.clear()
    /* getElementById, not textareaRef — and this is the lint rule earning its
       keep rather than being worked around. moreOptions below is an array
       built *during render* that holds this closure, and a closure over
       `.current` read from there is exactly what react-hooks/refs refuses (it
       is the same objection that stopped DownloadActions building its FORMATS
       with `run:` closures). EDITOR_ID is already exported as the outside
       world's handle on this element, for App to hand over the caret after
       the boot screen; this is the second caller of the same idea. */
    document.getElementById(EDITOR_ID)?.focus()
  }

  /* Built only for the overflow path. An empty editor has nothing to share or
     save, so those rows are not offered rather than offered and disabled — a
     sheet of dead rows is worse than a shorter sheet. Undo is the exception
     and the reason the button is not simply disabled when empty: clearing
     leaves the editor empty and the undo is the one thing you might want. */
  const moreOptions: ActionSheetOption[] = []
  if (!isEmpty) {
    if (SHARE_AVAILABLE) {
      moreOptions.push({ id: 'share', label: 'Share', hint: 'Send to another app', onSelect: share })
    }
    for (const f of DOWNLOAD_FORMATS) {
      moreOptions.push({
        id: f.id,
        label: `Save as ${f.label}`,
        hint: f.hint,
        onSelect: () => run(f.id),
      })
    }
  }
  if (editor.lastCleared !== null) {
    moreOptions.push({ id: 'undo', label: 'Undo clear', hint: 'Put the text back', onSelect: editor.undoClear })
  } else if (!isEmpty) {
    moreOptions.push({ id: 'clear', label: 'Clear', hint: 'Empty the editor', danger: true, onSelect: clear })
  }

  return (
    <div className="editor-shell">
      <div className={`editor${editor.flashing ? ' editor--flash' : ''}`}>
        <div className="sugg" aria-live="polite">
          {!editor.nepali ? (
            <span className="sugg-hint">Nepali conversion is off — typing plain English.</span>
          ) : !editor.pending ? (
            <span className="sugg-hint">Suggestions appear here as you type…</span>
          ) : (
            <>
              {editor.chips.map((chip) => (
                <button
                  key={chip.text}
                  type="button"
                  className={`chip dev${chip.primary ? ' chip--primary' : ''}`}
                  onClick={() => {
                    editor.chooseChip(chip.text)
                    textareaRef.current?.focus()
                  }}
                >
                  {chip.text}
                  {chip.primary && <kbd>space</kbd>}
                </button>
              ))}
              <button
                type="button"
                className="chip chip--raw"
                onClick={() => {
                  editor.keepRaw()
                  textareaRef.current?.focus()
                }}
              >
                {editor.pending} (keep)
              </button>
            </>
          )}
        </div>

        <textarea
          ref={textareaRef}
          id={EDITOR_ID}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Nepali editor — type romanized Nepali"
          placeholder="namaste — start typing, press space to convert…"
          value={editor.text}
          onChange={(e) => editor.handleChange(e.target.value, e.target.selectionEnd)}
          onKeyDown={editor.handleKeyDown}
        />

        <div className="actions">
          {/*
            Two buttons rather than one toggle. The single button showed only
            the mode you were *in*, so "EN" was ambiguous — it read equally as
            "you are in English" and "press for English". A segmented control
            shows both states at once and marks which one is live. Clicking the
            active option is a deliberate no-op.
          */}
          <div className="lang-seg" role="group" aria-label="Conversion mode">
            <button
              type="button"
              className="lang-seg__opt"
              aria-pressed={!editor.nepali}
              title="Type plain English — no conversion"
              onClick={() => {
                if (editor.nepali) {
                  tick()
                  editor.toggleMode()
                }
                textareaRef.current?.focus()
              }}
            >
              EN
            </button>
            <button
              type="button"
              className="lang-seg__opt dev"
              aria-pressed={editor.nepali}
              title="Convert romanized Nepali to Devanagari"
              onClick={() => {
                if (!editor.nepali) {
                  tick()
                  editor.toggleMode()
                }
                textareaRef.current?.focus()
              }}
            >
              नेपाली
            </button>
          </div>

          <button
            type="button"
            className="btn btn--icon"
            aria-haspopup="dialog"
            title="Cheat sheet — how letters map"
            aria-label="Cheat sheet — how letters map"
            onClick={onOpenCheatSheet}
          >
            <span className="dev" aria-hidden="true">
              क ख
            </span>
          </button>

          <div className="actions__spacer" />

          {/* Disabled on an empty editor, like clear beside it. Copying
              nothing silently "succeeds" — the label even flips to "copied" —
              which is the kind of feedback that teaches someone the button is
              broken. */}
          <button type="button" className="btn" disabled={isEmpty} onClick={editor.copy}>
            {editor.copied ? 'copied' : 'copy'}
          </button>
          {compactActions ? (
            <>
              <button
                type="button"
                className="btn btn--icon"
                aria-haspopup="dialog"
                aria-label="More actions — share, save, clear"
                title="More actions"
                disabled={moreOptions.length === 0 || busy}
                onClick={() => setMoreOpen(true)}
              >
                <MoreIcon />
              </button>
              <ActionSheet
                open={moreOpen}
                onClose={() => setMoreOpen(false)}
                label="Text actions"
                options={moreOptions}
              />
              {/* The print target for "Save as PDF". Rendered here rather than
                  by DownloadActions because on this path DownloadActions is
                  not on the page at all — and exactly one of them may exist,
                  since #print-sheet is an id the print stylesheet reaches for. */}
              <div id="print-sheet" ref={printSheetRef} className="print-sheet" />
            </>
          ) : (
            <>
              {/* Feature-detected, not just tried-and-caught — a browser with no
                  navigator.share has no share sheet to fail into, so the button
                  itself shouldn't exist there rather than existing and erroring
                  on every tap. */}
              {SHARE_AVAILABLE && (
                <button type="button" className="btn" disabled={isEmpty} onClick={share}>
                  share
                </button>
              )}
              {/* Typing is the app's main job and it was the one screen you could
                  not get a file out of — copy and share only, while Translate
                  beside it could hand you a .docx. Same component, smaller pill. */}
              <DownloadActions
                text={editor.text}
                filenameBase="lekh-nepali"
                label="your text"
                compact
              />
              {editor.lastCleared !== null ? (
                <button type="button" className="btn" onClick={editor.undoClear}>
                  undo clear
                </button>
              ) : (
                <button type="button" className="btn" disabled={isEmpty} onClick={clear}>
                  clear
                </button>
              )}
            </>
          )}
          {/* The character count carries its unit or it does not appear. As a
              bare trailing number — "5 words · 26" — it said nothing, and hard
              against the toolbar's right edge on a phone it read as a label
              that had been cut off rather than as a count. There is no room to
              spell it out at 390px without wrapping the row (the width this
              toolbar was rebuilt to stop wrapping), so below that it is simply
              the words, which is the number a writing app is asked for
              anyway. */}
          <span className="count">
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
            <span className="count__chars"> · {editor.text.length} characters</span>
          </span>
        </div>
      </div>

      {/*
        An empty state, not a permanent shelf. These vanish the moment there is
        anything in the editor — which is the only time they were ever useful,
        and the rest of the time they were a block of unexplained romanized
        Nepali sitting under someone's writing.
      */}
      {isEmpty && (
        <div className="starters">
          <span className="starters__label">Try one</span>
          <div className="starters__row">
            {STARTER_SAMPLES.map((sample) => (
              <button
                key={sample}
                type="button"
                className="starter"
                onClick={() => {
                  editor.appendSample(sample)
                  textareaRef.current?.focus()
                }}
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      )}

      {/*
        One line where there were three — a dismissible hint banner, a keyboard
        legend and a privacy note, stacked under the editor and between the
        user and the cheat sheet.

        The middle clause is still rendered both ways and swapped by pointer
        type in CSS. A phone keyboard has no esc key, so on a touch device that
        line was describing an escape hatch the user physically cannot reach —
        in the installed PWA, which is where most people type Nepali, it was
        the only instruction on screen that could not be followed. The touch
        equivalent already exists: the "(keep)" chip in the suggestion row does
        exactly what esc does.

        Rendered both ways rather than branched in JS: this is presentation,
        and a device that changes pointer type (a tablet gaining a keyboard)
        updates live instead of needing a re-render.
      */}
      <p className="editor-hint">
        <kbd>space</kbd> converts ·{' '}
        <span className="editor-hint__fine">
          <kbd>esc</kbd> keeps English
        </span>
        <span className="editor-hint__coarse">
          tap <b>(keep)</b> for English
        </span>{' '}
        · <kbd>.</kbd> becomes । · runs entirely on your device
      </p>
    </div>
  )
}
