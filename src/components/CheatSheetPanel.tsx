import { useEffect, useRef, useState } from 'react'
import { CheatSheet } from './CheatSheet'
import './CheatSheetPanel.css'

interface CheatSheetPanelProps {
  open: boolean
  onClose: () => void
  onInsert: (ch: string) => void
}

// Drag past 30% of the sheet's own height, or fling it fast enough even over
// a short distance, and it commits to closing rather than snapping back.
const DISMISS_HEIGHT_FRACTION = 0.3
const DISMISS_VELOCITY = 0.5 // px/ms
// Below this many px of vertical movement, a pointer session counts as a tap
// (closes via the click below) rather than a drag (closes only past the
// thresholds above, via handleGrabberPointerEnd).
const TAP_SLOP = 6

/* The script reference, on demand.
 *
 * It used to be a permanently-expanded right rail holding seven tables and
 * ~2000px of grid beside the editor. A cheat sheet is something you consult
 * for one letter and then leave, so it is now a panel: a slide-over from the
 * right on a wide screen, a bottom sheet on a phone, with a search field
 * because scanning seven tables for one glyph was always the slow path.
 */
export function CheatSheetPanel({ open, onClose, onInsert }: CheatSheetPanelProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  // Drag-to-dismiss for the mobile bottom sheet (see .cheat-panel__grabber —
  // hidden on the desktop slide-over, which keeps a plain click-to-close
  // button instead, since dragging isn't a natural desktop gesture).
  //
  // dragY drives the sheet's live position with an inline style rather than a
  // class, since it changes on every pointermove; isDragging only toggles the
  // CSS transition on/off (off while a finger is actually moving it, so the
  // sheet tracks 1:1 with no lag — on for the snap-back/fling-closed glide
  // once the pointer lifts).
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ y: number; time: number } | null>(null)
  // Set right before the fling-closed animation starts; onTransitionEnd
  // checks it to tell "just finished snapping back to 0" apart from "just
  // finished sliding the rest of the way off-screen, actually close now."
  const pendingCloseRef = useRef(false)
  // setPointerCapture (below) keeps the grabber as the pointer/click target
  // for the whole gesture even once the finger has moved well past its
  // bounds — which means the browser's own click-after-pointerup would fire
  // on this button after *every* drag, not just a tap. This is what tells
  // handleGrabberClick whether that click is a real tap (act on it) or the
  // tail end of a drag pointerup already decided (ignore it).
  const movedRef = useRef(false)

  const handleGrabberPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartRef.current = { y: e.clientY, time: performance.now() }
    movedRef.current = false
    setIsDragging(true)
  }

  const handleGrabberPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return
    const delta = e.clientY - dragStartRef.current.y
    if (Math.abs(delta) > TAP_SLOP) movedRef.current = true
    setDragY(Math.max(0, delta))
  }

  const handleGrabberPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current
    if (!start) return
    dragStartRef.current = null
    setIsDragging(false)
    if (!movedRef.current) {
      // A tap, not a drag — handleGrabberClick (fired right after this)
      // handles closing, so there's nothing to animate back from here.
      setDragY(0)
      return
    }
    const delta = Math.max(0, e.clientY - start.y)
    const elapsed = performance.now() - start.time
    const velocity = delta / Math.max(elapsed, 1)
    const height = innerRef.current?.getBoundingClientRect().height ?? 0
    if (delta > height * DISMISS_HEIGHT_FRACTION || velocity > DISMISS_VELOCITY) {
      pendingCloseRef.current = true
      setDragY(height)
    } else {
      setDragY(0)
    }
  }

  const handleGrabberClick = () => {
    // Real drags are already fully handled in handleGrabberPointerEnd —
    // acting on the click too would close the panel after *every* drag
    // regardless of distance, not just a tap.
    if (movedRef.current) return
    onClose()
  }

  const handleInnerTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== 'transform' || !pendingCloseRef.current) return
    pendingCloseRef.current = false
    ref.current?.close()
  }

  /* showModal() rather than the open attribute — the same call AboutSheet
     makes, for the same reasons: it buys the focus trap, the inert background,
     top-layer stacking (so the panel clears the app bar and the mobile dock
     without a z-index argument) and Escape-to-close, none of which we then
     have to write or test. The attribute form gives a non-modal box and none
     of that. */
  useEffect(() => {
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
       * something that is really just part of handling the close event. */
      onClose={() => {
        setQuery('')
        setDragY(0)
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
        className={`cheat-panel__inner${isDragging ? ' cheat-panel__inner--dragging' : ''}`}
        style={{ transform: `translateY(${dragY}px)` }}
        onTransitionEnd={handleInnerTransitionEnd}
      >
        {/* Bottom-sheet only (see the media query in CheatSheetPanel.css) — a
            plain click closes it like any button, keeping this operable for
            keyboard/AT users who can't drag; dragging or flinging it down
            closes it too, which is the whole point of a grabber over an X. */}
        <button
          type="button"
          className={`cheat-panel__grabber${isDragging ? ' cheat-panel__grabber--dragging' : ''}`}
          aria-label="Close"
          onClick={handleGrabberClick}
          onPointerDown={handleGrabberPointerDown}
          onPointerMove={handleGrabberPointerMove}
          onPointerUp={handleGrabberPointerEnd}
          onPointerCancel={handleGrabberPointerEnd}
        >
          <span className="cheat-panel__grabber-bar" aria-hidden="true" />
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
            placeholder="Search — type a sound, e.g. kh or tra"
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
          <CheatSheet onInsert={onInsert} query={query.trim().toLowerCase()} />
        </div>
      </div>
    </dialog>
  )
}
