import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { CheatSheet } from './CheatSheet'
import { useSheetDrag } from '../hooks/useSheetDrag'
import './SheetGrabber.css'
import './CheatSheetPanel.css'

interface CheatSheetPanelProps {
  open: boolean
  onClose: () => void
  onInsert: (ch: string) => void
  /* The editor's current text, mirrored in the echo strip below. Passed down
     rather than read from a store because there isn't one — and it costs
     nothing that matters: CheatSheet is memo'd on `onInsert`/`query`, so a
     keystroke re-renders this shell and stops at the 76 buttons. */
  text: string
}

/* Enough to fill the strip twice over on the widest phone, and a bound on
   what a long document puts into the DOM on every single tap. The fade on the
   left edge is what says the run continues past it. */
const ECHO_TAIL = 120

/* A cell's label can offer two spellings — "ph · f", "ksh · x", "w · v". One
   is what you say out loud; the pair read aloud is a riddle. */
function firstKey(roman: string): string {
  return roman.split('·')[0].trim()
}

/* The script reference, on demand.
 *
 * It used to be a permanently-expanded right rail holding seven tables and
 * ~2000px of grid beside the editor. A cheat sheet is something you consult
 * for one letter and then leave, so it is now a panel: a slide-over from the
 * right on a wide screen, a bottom sheet on a phone, with a search field
 * because scanning seven tables for one glyph was always the slow path.
 */
export function CheatSheetPanel({ open, onClose, onInsert, text }: CheatSheetPanelProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  /* Newlines flattened to a space: this is one line by construction, and a
     `pre` run containing them would otherwise render the tail as a blank. */
  const tail = useMemo(() => text.replace(/\n+/g, ' ').slice(-ECHO_TAIL), [text])

  /* What the echo strip shows, said out loud.
   *
   * The strip is aria-hidden — it mirrors the textarea, and a screen reader
   * reading both says every word twice. That left the tap itself with no
   * spoken answer at all, which is the same gap the strip was built to close,
   * just for a different reader. So the insert announces itself here instead.
   *
   * The romanized key is in it because a Devanagari glyph is silent under a
   * voice with no Nepali in it: "क k inserted" is read as "k inserted" by an
   * English voice and in full by a Nepali one, where a bare क would be read as
   * nothing at all by the first. The glyph carries lang="ne" so a voice that
   * *can* pronounce it does. */
  const [announcement, setAnnouncement] = useState<{ glyph: string; roman: string; alt: boolean }>({
    glyph: '',
    roman: '',
    alt: false,
  })
  const announceInsert = useCallback(
    (ch: string, roman: string) => {
      onInsert(ch)
      /* Tapping the same cell twice writes the same string, and a live region
         whose text has not changed is a live region that says nothing — so the
         repeat would be the one insert that goes unannounced. `alt` flips a
         zero-width space on the end: different text content, identical speech. */
      setAnnouncement((prev) => ({ glyph: ch, roman: firstKey(roman), alt: !prev.alt }))
    },
    [onInsert],
  )

  // Drag-to-dismiss for the mobile bottom sheet — see useSheetDrag. Hidden on
  // the desktop slide-over (.cheat-panel__grabber's own media query), which
  // keeps a plain click-to-close button instead, since dragging isn't a
  // natural desktop gesture.
  const drag = useSheetDrag(ref, innerRef, onClose)

  /* showModal() rather than the open attribute — the same call AboutSheet
     makes, for the same reasons: it buys the focus trap, the inert background,
     top-layer stacking (so the panel clears the app bar and the mobile dock
     without a z-index argument) and Escape-to-close, none of which we then
     have to write or test. The attribute form gives a non-modal box and none
     of that. */
  /* useLayoutEffect, not useEffect, and that is the difference between the
     panel appearing when you tap and appearing a beat later. useEffect runs
     *after* the browser has painted, so opening cost a whole extra paint
     cycle before showModal() had even been called — measured at ~45ms to
     first frame in Chromium and ~60ms in Firefox, which is where the hitch on
     open came from. This is a DOM mutation that has to be visually part of
     the click, which is exactly what useLayoutEffect is for. */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    /* Feature-checked because the build targets safari14 (see vite.config.ts)
       and <dialog> did not land until Safari 15.4. Calling showModal() where
       it does not exist throws out of an effect with no error boundary above
       it, which React answers by unmounting the tree — so the button would
       blank the whole app rather than fail to open a panel. */
    if (typeof el.showModal !== 'function' || typeof el.close !== 'function') return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="cheat-panel"
      aria-labelledby="cheat-panel-title"
      /* Fires for Escape and for close() alike, so the parent's state can
         never drift out of sync with the element's own open flag — and since
         every dismissal route ends in close(), it is also the one place that
         reliably sees the panel shut.
       *
       * Which is why the search resets here rather than in an effect watching
       * `open`. Clearing it from an effect body is a setState during render
       * commit, and React flags it: it schedules a second render pass for
       * something that is really just part of handling the close event.
       *
       * The blur matters for the same reason: dialog.close() only reliably
       * hands focus back to whatever opened it when the close is a direct
       * result of a user gesture. The drag-to-dismiss path closes from a
       * transitionend callback instead — not a gesture in the browser's
       * eyes — so without this, closing by drag left the search field
       * focused and the on-screen keyboard sitting open over a panel that
       * had already visually closed. */
      onClose={() => {
        setQuery('')
        setAnnouncement({ glyph: '', roman: '', alt: false })
        drag.reset()
        searchRef.current?.blur()
        onClose()
      }}
      /* Backdrop click. The ::backdrop pseudo-element is not an event target,
         so the click lands on the <dialog> itself — anything inside the panel
         stops at the panel, which is why the check is against currentTarget. */
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={innerRef}
        className={`cheat-panel__inner${drag.isDragging ? ' cheat-panel__inner--dragging' : ''}`}
        style={{ transform: `translateY(${drag.dragY}px)` }}
        onTransitionEnd={drag.handlePanelTransitionEnd}
      >
        {/* Bottom-sheet only (see the media query in CheatSheetPanel.css) — a
            plain click closes it like any button, keeping this operable for
            keyboard/AT users who can't drag; dragging or flinging it down
            closes it too, which is the whole point of a grabber over an X. */}
        <button
          type="button"
          className={`sheet-grabber cheat-panel__grabber${drag.isDragging ? ' sheet-grabber--dragging' : ''}`}
          aria-label="Close"
          onClick={drag.handleGrabberClick}
          /* Blurred right here, synchronously inside the touch that starts
             the gesture — not just in the dialog's onClose below. A blur()
             called later, from the transitionend callback the drag-closed
             path ends in, is too far removed from any real user gesture for
             Android's IME to treat it as a reason to actually hide the
             keyboard: the DOM focus moves, but the keyboard doesn't follow.
             Touching the grabber at all is real user activity, whether it
             ends in a tap, a snap-back, or a full drag-closed — so it's the
             reliable place to do this regardless of how the gesture ends. */
          onPointerDown={(e) => {
            searchRef.current?.blur()
            drag.handleGrabberPointerDown(e)
          }}
          onPointerMove={drag.handleGrabberPointerMove}
          onPointerUp={drag.handleGrabberPointerEnd}
          onPointerCancel={drag.handleGrabberPointerEnd}
        >
          <span className="sheet-grabber-bar" aria-hidden="true" />
        </button>

        <header className="cheat-panel__head">
          <h2 id="cheat-panel-title">How letters map</h2>
          <button type="button" className="cheat-panel__close" aria-label="Close" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {/* A one-line mirror of the end of the editor.
         *
         * On a phone the sheet stands over the editor at up to 90svh, so
         * tapping a cell put a letter somewhere you could not see — no way to
         * tell whether the tap had registered at all. Closing the sheet on
         * every insert would answer that and cost you the sheet.
         *
         * The tail, not the whole text, because insertAtCursor appends to the
         * end (see useEditorState): the end is the only place anything ever
         * lands, so a tail is a faithful mirror rather than a summary of one.
         *
         * aria-hidden because it duplicates the textarea, which is the real
         * thing and is still in the page; announcing both would read the same
         * words twice to anyone navigating by screen reader. */}
        <div
          className={`cheat-panel__echo${tail ? '' : ' cheat-panel__echo--empty'}`}
          aria-hidden="true"
        >
          {tail ? (
            <div className="cheat-panel__echo-view">
              <span className="dev">{tail}</span>
            </div>
          ) : (
            <span className="cheat-panel__echo-hint">Tap a letter — it lands here</span>
          )}
          <span className="cheat-panel__echo-caret" />
        </div>

        {/* Paired with the strip above: the strip is the seen answer, this is
            the heard one. role="status" is an implicit aria-live="polite", so
            an insert never interrupts what is already being read. */}
        <p className="sr-only" role="status">
          {announcement.glyph && (
            <>
              <span lang="ne">{announcement.glyph}</span> {announcement.roman} inserted
              {announcement.alt ? '\u200B' : ''}
            </>
          )}
        </p>

        <div className="cheat-panel__search">
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            /* Not autoFocus. On a phone the panel is a bottom sheet and
               focusing the field throws the on-screen keyboard over the very
               tables the user opened it to look at. */
            /* "tr", not "tra" — the key for त्र is tr, and the empty state
               a failed search lands on says so too. The placeholder was
               offering an example that returned "Nothing matches “tra”". */
            placeholder="Search — type a sound, e.g. kh or tr"
            aria-label="Search the cheat sheet"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              className="cheat-panel__clear"
              aria-label="Clear search"
              onClick={() => {
                setQuery('')
                searchRef.current?.focus()
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          )}
        </div>

        <div className="cheat-panel__body">
          <CheatSheet onInsert={announceInsert} query={query.trim().toLowerCase()} />
        </div>
      </div>
    </dialog>
  )
}
