import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useSheetDrag } from '../hooks/useSheetDrag'

import './SheetGrabber.css'
import './sheet.css'

interface SheetProps {
  open: boolean
  onClose: () => void
  /** id of the heading inside `children` that names this sheet. */
  labelledBy: string
  children: ReactNode
}

/* The bottom sheet, once, for both of the app's sheets.
 *
 * This was the About sheet's own code until Settings needed exactly the same
 * thing: a modal <dialog>, a grabber that drags it away on a phone, an X on
 * desktop, and a panel that scrolls inside its own rounded corners. Every
 * comment below is the original one — none of the behaviour changed, it just
 * stopped being About-specific.
 *
 * The cheat sheet deliberately does not use this. It is a searchable reference
 * panel with its own shape, not a card of rows.
 */
export function Sheet({ open, onClose, labelledBy, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  /* Set while the effect below closes the element because `open` went false. */
  const closingFromProp = useRef(false)

  // Drag-to-dismiss — only engages on the mobile bottom-sheet layout (see
  // .sheet__grabber's own media query in sheet.css, at the same 560px
  // breakpoint the bottom-sheet conversion already uses); the desktop
  // centered card keeps the plain X, since dragging isn't a natural gesture
  // for a floating card.
  const drag = useSheetDrag(ref, panelRef, onClose)

  /* showModal() rather than the open attribute. It is what buys the focus
     trap, the inert background, the top-layer stacking (so the sheet clears
     the app bar and the mobile tab bar without a z-index argument) and
     Escape-to-close — none of which we then have to write or test. The
     attribute form gives you a non-modal box and none of that. */
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
       and <dialog> did not land until Safari 15.4. On an older iPhone this
       threw straight out of an effect with no error boundary above it, which
       React answers by unmounting the tree — so tapping the wordmark blanked
       the whole app. Nothing opens on those browsers now; the CSS keeps the
       panel out of the page in the meantime. */
    if (typeof el.showModal !== 'function' || typeof el.close !== 'function') return
    if (open && !el.open) el.showModal()
    if (!open && el.open) {
      /* The parent asked for this one, so it must not be told about it —
         see the onClose handler below. */
      closingFromProp.current = true
      el.close()
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={labelledBy}
      /* Fires for Escape and for close() alike, so the parent's state can
         never drift out of sync with the element's own open flag — but only
         for closes the parent did not already ask for.
       *
         The distinction did not matter while `open` could only go false as a
         result of onClose: the second call landed on closeSheet's
         already-popped branch and did nothing. It matters now that one sheet
         can replace another. Opening About from the row at the bottom of
         Settings pushes an entry and sets the state to 'about', which takes
         `open` off Settings; Settings' element then closed, fired this, and
         closeSheet — seeing a sheet in the state, correctly — popped the entry
         straight back off. Both sheets ended up shut and the row did nothing.
         A close the parent initiated is already reflected in the parent. */
      onClose={() => {
        drag.reset()
        if (closingFromProp.current) {
          closingFromProp.current = false
          return
        }
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
        ref={panelRef}
        className={`sheet__panel${drag.isDragging ? ' sheet__panel--dragging' : ''}`}
        style={{ transform: `translateY(${drag.dragY}px)` }}
        onTransitionEnd={drag.handlePanelTransitionEnd}
      >
        {/* Mobile bottom-sheet only (see .sheet__grabber's media query) — a
            plain click closes it like any button, keeping this operable for
            keyboard/AT users who can't drag; dragging or flinging it down
            closes it too, which is the whole point of a grabber over an X. */}
        <button
          type="button"
          className={`sheet-grabber sheet__grabber${drag.isDragging ? ' sheet-grabber--dragging' : ''}`}
          aria-label="Close"
          onClick={drag.handleGrabberClick}
          onPointerDown={drag.handleGrabberPointerDown}
          onPointerMove={drag.handleGrabberPointerMove}
          onPointerUp={drag.handleGrabberPointerEnd}
          onPointerCancel={drag.handleGrabberPointerEnd}
        >
          <span className="sheet-grabber-bar" aria-hidden="true" />
        </button>
        <button type="button" className="sheet__close" aria-label="Close" onClick={onClose}>
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

        {children}
      </div>
    </dialog>
  )
}
