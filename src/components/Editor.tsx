import { useState, type RefObject } from 'react'
import type { EditorState } from '../hooks/useEditorState'
import { SAMPLES } from '../data/samples'
import { convertPhrase } from '../lib/engine'
import { SHARE_AVAILABLE } from '../lib/share'
import { isNativeApp } from '../lib/androidApp'
import { tick } from '../lib/haptics'
import { useToast } from '../hooks/useToast'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useIntroDemo } from '../hooks/useIntroDemo'
import { DOCK_QUERY } from '../hooks/useDockDetached'
import { DOWNLOAD_FORMATS, useDownloadActions } from '../hooks/useDownloadActions'
import { DownloadActions } from './DownloadActions'
import { ActionSheet, type ActionSheetOption } from './ActionSheet'
import { SheetIcon } from './SheetIcons'
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
  /** Splash still up — see TypePage, and useIntroDemo for who cares. */
  booting: boolean
}

/* The one-line legend. Its pointer-type halves are both rendered and swapped
   in CSS (a phone has no esc key — "(keep)" in the suggestion row is the
   touch equivalent); the mode is branched here, because with conversion off
   every clause but the last described something the editor was not doing,
   and what someone in that state needs is the way back. */
function EditorHint({ nepali }: { nepali: boolean }) {
  return (
    <p className="editor-hint">
      {nepali ? (
        /* Each clause is one unbreakable run, so a narrow screen breaks the
           line between clauses — it used to strand the । at the start of the
           second line, away from the full stop it is the answer to. */
        <>
          <span className="editor-hint__clause">
            <kbd>space</kbd> converts
          </span>{' '}
          ·{' '}
          <span className="editor-hint__clause editor-hint__fine">
            <kbd>esc</kbd> keeps English
          </span>
          <span className="editor-hint__clause editor-hint__coarse">
            tap <b>(keep)</b> for English
          </span>{' '}
          ·{' '}
          <span className="editor-hint__clause">
            <kbd>.</kbd> becomes ।
          </span>{' '}
          · <span className="editor-hint__clause">runs entirely on your device</span>
        </>
      ) : (
        <>
          Tap <b className="dev">नेपाली</b> to convert as you type · runs entirely on your device
        </>
      )}
    </p>
  )
}

const PLACEHOLDER = 'namaste — start typing, press space to convert…'

export function Editor({ editor, textareaRef, onOpenCheatSheet, booting }: EditorProps) {
  const toast = useToast()
  const isEmpty = editor.text.length === 0

  /* The one-time first-run demonstration. It drives the placeholder, so it is
     already impossible for it to cover anything the user has written; the
     emptiness argument is a snapshot taken at mount, and is about never
     *starting* for someone who arrived with a draft. See useIntroDemo. */
  const intro = useIntroDemo(!booting, isEmpty)
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
  const { busy, run } = useDownloadActions({
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
  const native = isNativeApp()
  const moreOptions: ActionSheetOption[] = []
  if (!isEmpty) {
    if (SHARE_AVAILABLE) {
      moreOptions.push({
        id: 'share',
        label: 'Share',
        hint: 'Send to another app',
        icon: <SheetIcon name="share" />,
        onSelect: share,
      })
    }
    /* "Save as" is the web's verb, and only the web's. Inside the app
       saveFile hands the file to the system share sheet (see download.ts —
       a WebView drops an <a download> silently), so a row promising to save
       a .txt opened a list of chat apps instead. The sheet is still the right
       mechanism; the label just has to say which mechanism it is, the way the
       PDF row already names the print dialog. */
    for (const f of DOWNLOAD_FORMATS) {
      moreOptions.push({
        id: f.id,
        label: native ? `Export ${f.noun}` : `Save as ${f.noun}`,
        hint: native && f.id !== 'pdf' ? `${f.hint} · via the share sheet` : f.hint,
        icon: <SheetIcon name={f.icon} />,
        onSelect: () => run(f.id),
      })
    }
  }
  /* Clear and Undo are no longer in here: on the phone they are a button of
     their own in the toolbar (see below), and the desktop row has always had
     them inline. A tester's first complaint was having to open ⋯ to find the
     one action everybody uses, and the sheet now holds only the ways out —
     share and the files. */

  return (
    <div className="editor-shell">
      <div className={`editor${editor.flashing || intro.flashing ? ' editor--flash' : ''}`}>
        {/*
          The strip keeps its reserved height whether or not it has chips —
          letting it collapse would jump the textarea by a row as you type —
          but it no longer fills that height with a sentence.

          "Suggestions appear here as you type…" was on screen 100% of the
          time before anyone typed, and most of the time while they did (the
          chips only exist mid-word), so the app opened on a permanent band of
          grey text describing a thing that was not happening. With the strip's
          fill and hairline gone too (see .sugg), the reserved space is now
          just the top margin of the writing surface.

          The conversion-off line stays. That one is not teaching, it is
          state — the editor is behaving differently from how it looks, and
          this is the only thing that says so.
        */}
        <div className="sugg" aria-live="polite">
          {!editor.nepali ? (
            <span className="sugg-hint">Nepali conversion is off — typing plain English.</span>
          ) : !editor.pending ? null : (
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

        <div className="editor-field">
        <textarea
          ref={textareaRef}
          id={EDITOR_ID}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Nepali editor — type romanized Nepali"
          placeholder={intro.text ?? PLACEHOLDER}
          value={editor.text}
          onChange={(e) => editor.handleChange(e.target.value, e.target.selectionEnd)}
          /* Typing already ends the demonstration on its own — a placeholder is
             gone the moment there is a character in the field — but a tap that
             only moves the caret does not, and sitting there animating under
             someone's cursor is its own kind of wrong. Both handlers still run
             their real work; stop() is idempotent and a no-op once it has. */
          onKeyDown={(e) => {
            intro.stop()
            editor.handleKeyDown(e)
          }}
          onPointerDown={intro.stop}
        />

          {/* The empty state, inside the writing surface rather than under it.
              The starters and the legend used to sit below the editor, past
              its toolbar, where they read as a page footer — a tester called
              the section "out of place", and it was: the one invitation to
              tap something sat furthest from where you type. Centred in the
              blank field, they are the field's own first-run content, and
              they disappear with the first character the same way the
              placeholder does.

              Layered over the textarea with pointer-events: none, so a tap
              anywhere but a starter still lands in the field and raises the
              keyboard. Held back while the demonstration runs, so the first
              thing on screen is one word typing itself (see useIntroDemo). */}
          {isEmpty && !intro.active && (
            <div className="editor-empty reveal">
              {/* See .editor-mark in Editor.css — aria-hidden texture, now a
                  centred mark above the starters rather than a full-field
                  watermark behind everything. */}
              <span className="editor-mark" aria-hidden="true">
                <span className="editor-mark__key">a</span>
                <span className="editor-mark__arrow">→</span>
                {/* No `dev` class — .editor-mark sets the display face. */}
                <span className="editor-mark__dev">अ</span>
              </span>
              {/* What the screen is, in the words people search for. "Romanized
                  Nepali Unicode" is the name Nepali typists already know the
                  layout by (see the standing rule in maps.ts), and Unicode is
                  the reason to use it over a Preeti-style font: the text pastes
                  correctly into any app. */}
              <div className="editor-empty__intro">
                <p className="editor-empty__title">Romanized Nepali Unicode</p>
                <p className="editor-empty__sub">
                  Type in English letters, get Nepali Unicode you can paste anywhere.
                </p>
              </div>
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
                      {/* What you type over what you get; convertPhrase is the
                          same function appendSample runs, so the two halves
                          cannot drift. */}
                      <span className="starter__roman">{sample}</span>
                      <span className="starter__dev dev">{convertPhrase(sample)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <EditorHint nepali={editor.nepali} />
            </div>
          )}
        </div>

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

          {/* Labelled, and stacked rather than beside — which is the only
              reason it can be labelled at all. This row has 47px of headroom
              at the default text size and 7px at the widest; a word set next
              to the glyph costs 38 of that and wraps the toolbar. Set under
              it, the button's width is governed by the wider of the two lines
              instead of their sum, so the label costs about 3px and the row
              survives every setting.

              It is the same shape as the dock (see TabSwitcher) for the same
              reason: क ख is the one control here that has to explain itself.
              ⋯ beside it keeps its glyph — an overflow dot-row is a convention
              a user has already met, where a pair of Devanagari letters on a
              button is not.

              Drawn as a .btn now, not in the accent tint. Pink fill, pink
              hairline and a caption at 75% opacity made it read as a tag or a
              badge — "doesn't look like a button" was the tester's word for
              it. Same skin as Clear and ⋯ beside it. */}
          <button
            type="button"
            className="btn btn--stack btn--letters"
            aria-haspopup="dialog"
            title="Cheat sheet — how letters map"
            aria-label="Cheat sheet — how letters map"
            onClick={onOpenCheatSheet}
          >
            <span className="dev" aria-hidden="true">
              क ख
            </span>
            <span className="btn__label" aria-hidden="true">
              Letters
            </span>
          </button>

          <div className="actions__spacer" />

          {compactActions ? (
            /* The phone row. Nothing on this side until there is something to
               act on — an empty editor opened on three disabled buttons, which
               on a first launch is three things that look broken. They arrive
               with the first character, into the empty end of the row, so
               nothing a thumb is already on moves. */
            isEmpty ? (
              editor.lastCleared !== null && (
                <div className="actions__end reveal">
                  <button
                    type="button"
                    className="btn btn--clear"
                    aria-label="Undo clear"
                    onClick={editor.undoClear}
                  >
                    <span className="btn__icon" aria-hidden="true">
                      <SheetIcon name="undo" size={18} />
                    </span>
                    <span className="btn__text" aria-hidden="true">
                      Undo
                    </span>
                  </button>
                </div>
              )
            ) : (
              /* One group, so that if the row ever has to wrap (the largest
                 text size on a narrow phone) the three go to the next line
                 together, right-aligned, instead of ⋯ dropping on its own. */
              <div className="actions__end reveal">
                {/* Out of the ⋯ sheet, where a tester could not find it. It
                    becomes Undo in the same slot the moment it is used, so a
                    mis-tap costs one more tap rather than the text. Below a
                    certain row width it drops its word for the icon — see the
                    @container rule on .actions. */}
                <button
                  type="button"
                  className="btn btn--clear"
                  aria-label="Clear"
                  onClick={clear}
                >
                  <span className="btn__icon" aria-hidden="true">
                    <SheetIcon name="trash" size={18} />
                  </span>
                  <span className="btn__text" aria-hidden="true">Clear</span>
                </button>
                {/* The filled one — getting the Devanagari out is what someone
                    came here to do. See .btn--primary. */}
                <button type="button" className="btn btn--primary" onClick={editor.copy}>
                  {editor.copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  className="btn btn--icon"
                  aria-haspopup="dialog"
                  aria-label="More actions — share, export"
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
                >
                  {/* The count lives here on a phone. In the row it was the
                      price of a visible Clear — the row has no width for
                      both — and it is a number people look up, not watch. */}
                  <p className="action-sheet__text">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'} · {editor.text.length}{' '}
                    {editor.text.length === 1 ? 'character' : 'characters'}
                  </p>
                </ActionSheet>
              </div>
            )
          ) : (
            <>
              {/* Disabled on an empty editor, like clear beside it. Copying
                  nothing silently "succeeds" — the label even flips to
                  "copied" — which teaches someone the button is broken. */}
              <button
                type="button"
                className="btn btn--primary"
                disabled={isEmpty}
                onClick={editor.copy}
              >
                {editor.copied ? 'Copied' : 'Copy'}
              </button>
              {/* Feature-detected, not just tried-and-caught — a browser with
                  no navigator.share has no share sheet to fail into. */}
              {SHARE_AVAILABLE && (
                <button type="button" className="btn" disabled={isEmpty} onClick={share}>
                  Share
                </button>
              )}
              <DownloadActions
                text={editor.text}
                filenameBase="lekh-nepali"
                label="your text"
                compact
              />
              {editor.lastCleared !== null ? (
                <button type="button" className="btn" onClick={editor.undoClear}>
                  Undo clear
                </button>
              ) : (
                <button type="button" className="btn" disabled={isEmpty} onClick={clear}>
                  Clear
                </button>
              )}
              {/* The character count carries its unit or it does not
                  appear; a bare trailing number read as a cut-off label. */}
              <span className={`count${wordCount === 0 ? ' count--empty' : ''}`}>
                {wordCount} {wordCount === 1 ? 'word' : 'words'}
                <span className="count__chars"> · {editor.text.length} characters</span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* With conversion off, the one line that says how to turn it back on.
          On an empty editor that line is part of the empty state above; once
          there is text, it is the only thing on screen saying the editor is
          behaving differently from how it looks, so it stays. */}
      {!isEmpty && !editor.nepali && <EditorHint nepali={false} />}
    </div>
  )
}
