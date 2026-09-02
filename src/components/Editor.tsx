import type { RefObject } from 'react'
import type { EditorState } from '../hooks/useEditorState'
import { SAMPLES } from '../data/samples'
import { SHARE_AVAILABLE } from '../lib/share'
import { tick } from '../lib/haptics'
import { useToast } from '../hooks/useToast'
import './Editor.css'

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
          {/* Feature-detected, not just tried-and-caught — a browser with no
              navigator.share has no share sheet to fail into, so the button
              itself shouldn't exist there rather than existing and erroring
              on every tap. */}
          {SHARE_AVAILABLE && (
            <button
              type="button"
              className="btn"
              disabled={isEmpty}
              /* A share that fails has nowhere to say so — the sheet simply
                 never appears and the tap looks ignored. Dismissing it is not
                 a failure and never reaches here (see share.ts). */
              onClick={() => {
                void editor.share().catch(() => toast.problem('Could not open the share sheet'))
              }}
            >
              share
            </button>
          )}
          {editor.lastCleared !== null ? (
            <button type="button" className="btn" onClick={editor.undoClear}>
              undo clear
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              disabled={isEmpty}
              onClick={() => {
                editor.clear()
                textareaRef.current?.focus()
              }}
            >
              clear
            </button>
          )}
          <span className="count">
            {wordCount} {wordCount === 1 ? 'word' : 'words'} · {editor.text.length}
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
