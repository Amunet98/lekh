import { useEffect, useRef, useState } from 'react'
import { CheatSheet } from './CheatSheet'
import './CheatSheetPanel.css'

interface CheatSheetPanelProps {
  open: boolean
  onClose: () => void
  onInsert: (ch: string) => void
}

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
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

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
        onClose()
      }}
      /* Backdrop click. The ::backdrop pseudo-element is not an event target,
         so the click lands on the <dialog> itself — anything inside the panel
         stops at the panel, which is why the check is against currentTarget. */
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="cheat-panel__inner">
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
