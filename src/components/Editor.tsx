import { useEffect, useMemo, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import type { EditorState } from '../hooks/useEditorState'
import { SHARE_AVAILABLE } from '../lib/share'
import { PASTE_AVAILABLE, readClipboardText } from '../lib/clipboard'
import { tick } from '../lib/haptics'
import { looksLikePreeti, preetiToUnicode, unicodeToPreeti } from '../lib/preeti'
import { usePref } from '../hooks/usePref'
import { ToolIcon } from './tools/ToolIcons'
import { useToast } from '../hooks/useToast'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { DOCK_QUERY } from '../hooks/useDockDetached'
import { DownloadActions } from './DownloadActions'
import { MoreActions } from './MoreActions'
import { SheetIcon } from './SheetIcons'
import { LiveDemo } from './LiveDemo'
import './Editor.css'

/* Exported so App can hand the caret over when the boot screen leaves without
   threading a ref up through TypePage. The ref below is the in-component
   route and stays the one this file uses; this id is purely the outside
   world's handle on the same element. */
export const EDITOR_ID = 'lekh-editor'

interface EditorProps {
  editor: EditorState
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onOpenCheatSheet: () => void
}

/* The one-line legend. Its pointer-type halves are both rendered and swapped
   in CSS (a phone has no esc key — "(keep)" in the suggestion row is the
   touch equivalent); the mode is branched here, because with conversion off
   every clause but the last described something the editor was not doing,
   and what someone in that state needs is the way back. */
function EditorHint({ nepali }: { nepali: boolean }) {
  if (!nepali) {
    return (
      <p className="editor-hint">
        Tap <b className="dev">नेपाली</b> to convert as you type · runs entirely on your device
      </p>
    )
  }
  return (
    <>
      {/* The lesson, playing itself — see LiveDemo. It replaced a
          three-step list (1.9.71) at the owner's choice, 2026-10-28. Not
          tappable: the "Try one" starters that inserted text here were
          removed at the owner's call. */}
      <LiveDemo />
      {/* The two finer points, one quiet line under the demonstration. Each
          clause is one unbreakable run so a narrow screen breaks between them
          — it used to strand the । away from the full stop it answers. */}
      <p className="editor-hint">
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
        · <span className="editor-hint__clause">works offline</span>
      </p>
    </>
  )
}

/* No placeholder since 1.9.93 (owner: remove it). The empty state below the
   field (LiveDemo plus one steps line) already shows what typing does, so
   "namaste — start typing, press space to convert…" said it a second time. */

export function Editor({ editor, textareaRef, onOpenCheatSheet }: EditorProps) {
  const toast = useToast()
  const isEmpty = editor.text.length === 0
  /* The first-run demonstration that typed "namaste" into the placeholder
     (useIntroDemo) is gone, with its Settings replay row: LiveDemo in the
     empty state shows the same thing on every launch (owner's call, 1.9.85). */
  const wordCount = editor.text.trim() === '' ? 0 : editor.text.trim().split(/\s+/).length

  /* Eight controls do not fit one row on a phone.
   *
   * EN/नेपाली, कख, copy, share, Download, clear and the count were a wrapping
   * flex row, and at 390px it wrapped — leaving `clear` and the word count
   * stranded on a second line and pushing the editor up by a row for the
   * privilege. So below the dock breakpoint the row keeps what is used most
   * (the mode, the cheat sheet, copy) and everything else moves behind one
   * overflow control — MoreActions, which Translate's phone row now shares. */
  const compactActions = useMediaQuery(DOCK_QUERY)
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
  /* Pasted Preeti (1.9.94). Text copied out of an old Word file or a
     government PDF often arrives in Preeti, which is Latin gibberish here
     (g]kfn for नेपाल), and going through handleChange a trailing space
     would even convert its last word as if it were romanized. So a paste
     that reads as Preeti (looksLikePreeti, which only flags it when it is
     fairly sure) goes in untouched and the box offers, once, to convert
     that run. Converting turns the offer into Undo for six seconds, the
     same window Clear's Undo gets. */
  const [preetiOffer, setPreetiOffer] = useState<{ start: number; raw: string } | null>(null)
  const [preetiDone, setPreetiDone] = useState<{ before: string; caret: number } | null>(null)
  /* The offer is about one run of text; once that run is no longer what is
     in the box (typed over, cleared, undone), it goes. Adjusted during
     render, since it only ever follows the text. */
  if (
    preetiOffer &&
    editor.text.slice(preetiOffer.start, preetiOffer.start + preetiOffer.raw.length) !== preetiOffer.raw
  ) {
    setPreetiOffer(null)
  }
  useEffect(() => {
    if (!preetiDone) return
    const timer = setTimeout(() => setPreetiDone(null), 6000)
    return () => clearTimeout(timer)
  }, [preetiDone])

  const insertPreeti = (el: HTMLTextAreaElement, start: number, end: number, clip: string) => {
    const next = editor.text.slice(0, start) + clip + editor.text.slice(end)
    el.focus()
    flushSync(() => editor.setText(next))
    el.setSelectionRange(start + clip.length, start + clip.length)
    setPreetiDone(null)
    setPreetiOffer({ start, raw: clip })
  }
  const convertPreeti = () => {
    if (!preetiOffer) return
    const before = editor.text
    const unicode = preetiToUnicode(preetiOffer.raw)
    const end = preetiOffer.start + preetiOffer.raw.length
    const at = preetiOffer.start + unicode.length
    tick()
    flushSync(() => editor.setText(before.slice(0, preetiOffer.start) + unicode + before.slice(end)))
    textareaRef.current?.setSelectionRange(at, at)
    setPreetiOffer(null)
    setPreetiDone({ before, caret: end })
  }
  const undoPreeti = () => {
    if (!preetiDone) return
    tick()
    flushSync(() => editor.setText(preetiDone.before))
    textareaRef.current?.setSelectionRange(preetiDone.caret, preetiDone.caret)
    setPreetiDone(null)
  }
  const preetiPreview = (() => {
    if (!preetiOffer) return ''
    const out = preetiToUnicode(preetiOffer.raw).replace(/\s+/g, ' ').trim()
    return out.length > 48 ? `${out.slice(0, 48).trimEnd()}…` : out
  })()

  /* The other direction (1.9.96): what you typed, as Preeti keys, for the
     old Preeti-font Word files and forms that still want it. It used to mean
     Copy, Tools → Preeti, paste, copy again, and many people never found the
     tool. Two ways in, both quiet: "Copy as Preeti" in ⋯, and a Preeti chip
     at the foot of the box that opens a live strip under the text (owner
     chose both; an always-on panel like nepali-type's was declined as one
     more box on every visit). The strip's open state is remembered. */
  const [preetiStrip, setPreetiStrip] = usePref('preetiStrip')
  const preetiKeys = useMemo(
    () => (preetiStrip ? unicodeToPreeti(editor.committed) : ''),
    [preetiStrip, editor.committed],
  )
  const copyPreeti = async () => {
    try {
      await navigator.clipboard.writeText(unicodeToPreeti(editor.committed))
      toast.done('Copied in Preeti')
    } catch {
      toast.problem('Could not copy')
    }
  }

  /* Paste exactly as a long-press paste would: the clipboard text replaces
     the selection and goes through handleChange, the same path the native
     paste takes, so a trailing space or full stop converts the word before
     it here just as it does there.

     Selection is read before the await, while it is still the one the user
     left. Focus goes in before handleChange because useEditorState only
     places the caret on a focused field. Then the caret is put back by its
     distance from the END of the text: everything after the paste point is
     untouched, so that distance survives a conversion that changes the
     length of what came before it, where an index from the start would not. */
  const paste = async () => {
    const el = textareaRef.current
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
    if (looksLikePreeti(clip)) {
      insertPreeti(el, start, end, clip)
      return
    }
    const next = editor.text.slice(0, start) + clip + editor.text.slice(end)
    const tail = editor.text.length - end
    el.focus()
    /* flushSync, not a requestAnimationFrame: after the await this update is
       scheduled as a separate task, and on the A024's WebView the frame came
       first — the caret was placed, then React wrote the value and threw it
       to the end. Measured: a mid-text paste left the caret at 17, not 12. */
    flushSync(() => editor.handleChange(next, start + clip.length))
    const at = el.value.length - tail
    el.setSelectionRange(at, at)
  }

  return (
    <div className="editor-shell">
      <div className={`editor${editor.flashing ? ' editor--flash' : ''}`}>
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
        {/* The strip and Paste share the editor's top edge: Paste sits in the
            field's top-right corner, the way the reference editor the owner
            pointed at (nepali-type.pages.dev) anchors its clipboard actions
            to the text rather than to a toolbar. A row of its own so the
            chips keep scrolling sideways underneath without pushing it off. */}
        <div className="editor-top">
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
          {PASTE_AVAILABLE && (
            <button
              type="button"
              className="btn btn--icon editor-paste"
              aria-label="Paste"
              title="Paste"
              onClick={() => void paste()}
            >
              <SheetIcon name="paste" size={18} />
            </button>
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
          value={editor.text}
          onChange={(e) => {
            if (preetiDone) setPreetiDone(null)
            editor.handleChange(e.target.value, e.target.selectionEnd)
          }}
          onPaste={(e) => {
            const clip = e.clipboardData.getData('text')
            if (!clip || !looksLikePreeti(clip)) return
            e.preventDefault()
            const el = e.currentTarget
            insertPreeti(el, el.selectionStart, el.selectionEnd, clip)
          }}
          onKeyDown={editor.handleKeyDown}
          /* Caret moves change which word is pending (and so the
             suggestions), even when no text changes. */
          onSelect={(e) => editor.handleSelect(e.currentTarget.selectionEnd)}
        />

          {preetiOffer && (
            <div className="editor-preeti" role="status">
              <p className="editor-preeti__text">
                This looks like Preeti text.
                <span className="editor-preeti__preview dev" lang="ne">
                  {preetiPreview}
                </span>
              </p>
              <span className="editor-preeti__actions">
                <button type="button" className="btn" onClick={() => setPreetiOffer(null)}>
                  Keep as is
                </button>
                <button type="button" className="btn btn--primary" onClick={convertPreeti}>
                  Convert to Unicode
                </button>
              </span>
            </div>
          )}
          {preetiDone && !preetiOffer && (
            <div className="editor-preeti editor-preeti--done" role="status">
              <p className="editor-preeti__text">Converted from Preeti</p>
              <span className="editor-preeti__actions">
                <button type="button" className="btn" onClick={undoPreeti}>
                  <SheetIcon name="undo" size={16} />
                  Undo
                </button>
              </span>
            </div>
          )}

          {/* The empty state, inside the writing surface rather than under it:
              the mark, what the screen is, and the one-line legend, centred in
              the blank field and gone with the first character, the same way
              the placeholder is. It used to sit below the editor past its
              toolbar, where it read as a page footer.

              The "Try one" starters that were here are gone (owner's call):
              tapping one dropped finished Devanagari into the field, which
              taught nothing the cheat sheet does not, and with the layout now
              named above them they were clutter.

              Transparent to the pointer, so a tap anywhere lands in the field
              and raises the keyboard. */}
          {isEmpty && (
            <div className="editor-empty reveal">
              {/* See .editor-mark in Editor.css — aria-hidden texture, a
                  centred mark heading the empty state. */}
              {/* English mode only: in Nepali mode the moving example
                  below is the picture, and two of them compete. */}
              {!editor.nepali && (
                <span className="editor-mark" aria-hidden="true">
                  <span className="editor-mark__key">a</span>
                  <span className="editor-mark__arrow">→</span>
                  {/* No `dev` class — .editor-mark sets the display face. */}
                  <span className="editor-mark__dev">अ</span>
                </span>
              )}
              {/* What the screen is, in the words people search for. "Romanized
                  Nepali Unicode" is the name Nepali typists already know the
                  layout by (see the standing rule in maps.ts), and Unicode is
                  the reason to use it over a Preeti-style font: the text pastes
                  correctly into any app. */}
              <div className="editor-empty__intro">
                <p className="editor-empty__title">Romanized Nepali Unicode</p>
                {/* The sub-line only in English mode now: in Nepali mode the
                    steps below say the same thing, and say how. */}
                {!editor.nepali && (
                  <p className="editor-empty__sub">
                    Type in English letters, get Nepali Unicode you can paste anywhere.
                  </p>
                )}
              </div>
              <EditorHint nepali={editor.nepali} />
            </div>
          )}
        </div>

        {/* Clear, at the foot of the text it clears, in the text box's
            bottom-right corner — the nepali-type arrangement the owner chose
            (2026-11-01), mirroring Paste at the top-right. It left the toolbar
            because with its icon and word both showing (owner's call, so the
            control has one look on every phone) the phone row wrapped onto two
            lines below 380px at the default text size and on almost every
            phone at the larger ones. Measured; the row now holds only the mode,
            Letters, Copy and ⋯.

            One slot, two states, as before: Clear becomes Undo the moment it
            is used, so a mis-tap costs one more tap rather than the text. The
            row exists only while one of them applies, so an empty editor
            still opens on nothing to press. Desktop too: its toolbar used to
            carry its own word-only Clear, and one control in one place at
            every width is the point of this change. */}
        {preetiStrip && !isEmpty && (
          <div className="editor-preeti-strip reveal">
            <div className="editor-preeti-strip__head">
              <span className="editor-preeti-strip__label">Preeti</span>
              <span className="editor-preeti-strip__hint">for Preeti-font documents</span>
              <button type="button" className="btn editor-preeti-strip__copy" onClick={() => void copyPreeti()}>
                Copy
              </button>
              <button
                type="button"
                className="btn btn--icon editor-preeti-strip__close"
                aria-label="Hide Preeti"
                title="Hide Preeti"
                onClick={() => {
                  tick()
                  setPreetiStrip(false)
                }}
              >
                <ToolIcon name="x" size={16} />
              </button>
            </div>
            {/* translate="no": the browser's own translator would otherwise
                offer to "translate" a line of Preeti keys from Latin. */}
            <p className="editor-preeti-strip__text" translate="no">
              {preetiKeys}
            </p>
          </div>
        )}

        {(!isEmpty || editor.lastCleared !== null) && (
          <div className="editor-foot reveal">
            {!isEmpty && !preetiStrip && (
              <button
                type="button"
                className="btn btn--clear editor-preeti-chip"
                title="Show this text in Preeti keys"
                onClick={() => {
                  tick()
                  setPreetiStrip(true)
                }}
              >
                <span className="btn__icon" aria-hidden="true">
                  <ToolIcon name="preeti" size={18} />
                </span>
                <span className="btn__text">Preeti</span>
              </button>
            )}
            {isEmpty ? (
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
                  Undo clear
                </span>
              </button>
            ) : (
              <button type="button" className="btn btn--clear" aria-label="Clear" onClick={clear}>
                <span className="btn__icon" aria-hidden="true">
                  <SheetIcon name="trash" size={18} />
                </span>
                <span className="btn__text" aria-hidden="true">
                  Clear
                </span>
              </button>
            )}
          </div>
        )}

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
            isEmpty ? null : (
              /* One group, so that if the row ever has to wrap the two go to
                 the next line together, right-aligned, instead of ⋯ dropping
                 on its own. Clear is not in it any more — see .editor-foot. */
              <div className="actions__end reveal">
                {/* The filled one — getting the Devanagari out is what someone
                    came here to do. See .btn--primary. */}
                <button type="button" className="btn btn--primary" onClick={editor.copy}>
                  {editor.copied ? 'Copied' : 'Copy'}
                </button>
                <MoreActions
                  text={editor.text}
                  filenameBase="lekh-nepali"
                  onShare={share}
                  extra={[
                    {
                      id: 'preeti',
                      label: 'Copy as Preeti',
                      hint: 'For documents in the Preeti font',
                      icon: <ToolIcon name="preeti" size={20} />,
                      onSelect: () => void copyPreeti(),
                    },
                  ]}
                >
                  {/* The count lives here on a phone. In the row it was the
                      price of a visible Clear — the row has no width for
                      both — and it is a number people look up, not watch. */}
                  <p className="action-sheet__text">
                    {wordCount} {wordCount === 1 ? 'word' : 'words'} · {editor.text.length}{' '}
                    {editor.text.length === 1 ? 'character' : 'characters'}
                  </p>
                </MoreActions>
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
