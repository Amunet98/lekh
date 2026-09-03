import {
  Children,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

import './screen.css'

interface ScreenProps {
  open: boolean
  /* Which pane is on top. 0 is the root; every pane above it was pushed by a
     row on the one below. Driven by history — see useAppNavigation. */
  depth: number
  /** id of the bar title naming the pane at `depth`. */
  labelledBy: string
  /* One level back. The root pane's own leading button leaves the screen, and
     both cases are the same history.back(), which is why there is one handler
     here rather than an onBack and an onClose. */
  onDismiss: () => void
  children: ReactNode
}

/* A full screen, and a stack of panes inside it.
 *
 * Settings and About used to be two bottom sheets — two <dialog>s, each of
 * which opened and closed on its own. That is what made coming back from
 * About so bad: About's element vanished with no exit at all (a closed dialog
 * is display:none, there is nothing to animate), Settings' element then ran
 * its entry keyframes again from scratch, and the settings list you had
 * scrolled halfway down came back at the top. Three separate tells, in one
 * gesture, that the "page" you were on had been thrown away and rebuilt.
 *
 * So there is one dialog now and it never closes in between. About is a pane
 * beside Settings inside it, and going back is one transform on two elements:
 * About slides off to the right while Settings slides back from a fifth of
 * the way left, which is the parallax every native push/pop has. Nothing
 * unmounts, so the scroll position, the measured cache size and the focus
 * ring are all still there when you arrive — because they never left.
 *
 * Full screen rather than a card is the other half of the same idea. A bottom
 * sheet says "this is a detour and you are still on the page underneath",
 * which is true of the cheat sheet and was never true of Settings: it has
 * groups, a subpage and enough rows to scroll. Sheets that grow a hierarchy
 * are pages that have not admitted it yet.
 */
export function Screen({ open, depth, labelledBy, onDismiss, children }: ScreenProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const panes = Children.toArray(children)

  /* The depth the panes are actually parked at, which is `depth` while the
     screen is open and the *last* such value once it closes.
   *
     Closing is where the two come apart. Every dismissal the user can perform
     is a history.back(), and the state it lands on has no sheet in it at all
     — so `depth` drops to 0 in the very same render that takes `open` away.
     Following it would slide the panes home underneath the fade-out: leaving
     About, you would watch it walk back to Settings before the screen agreed
     to go. Held, the screen exits showing what the user was looking at.
   *
     The catch-up is a state adjustment during render — React's own answer to
     "a prop changed and some state has to follow it", and it re-renders before
     anything is committed, so no frame is ever drawn at the stale depth. It
     lands on the next open, where the panes' previous computed style was
     display:none and a transition therefore cannot start: the reset arrives
     already parked rather than sliding into place. */
  const [shown, setShown] = useState(depth)
  if (open && shown !== depth) setShown(depth)

  /* showModal() rather than the open attribute — the focus trap, the inert
     background, the top layer (which is how this clears the app bar and the
     phone dock without a z-index argument) and Escape all come with it, and
     none of them come with the attribute. */
  /* useLayoutEffect, not useEffect: useEffect runs after the browser has
     painted, so opening cost a whole extra paint cycle before showModal() had
     even been called — measured at ~45ms to first frame in Chromium and ~60ms
     in Firefox on the sheet this replaces. */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    /* Feature-checked because the build targets safari14 (see vite.config.ts)
       and <dialog> did not land until Safari 15.4. On an older iPhone this
       threw straight out of an effect with no error boundary above it, which
       React answers by unmounting the tree — so opening Settings blanked the
       whole app. Nothing opens on those browsers now; the CSS keeps the
       screen out of the page in the meantime. */
    if (typeof el.showModal !== 'function' || typeof el.close !== 'function') return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  /* Focus follows the push, because inert would otherwise strand it. The row
     you tapped is inside the pane that just became inert, and a focused inert
     element hands focus back to <body> — from where Tab starts at the top of
     the document and the screen reader has nothing to announce. Landing on
     the pane itself (tabIndex -1) puts both back where the user is.
   *
     Only on a *forward* push does the new pane start at the top: coming back
     to Settings with its list scrolled to where you left it is the entire
     point of keeping it mounted. */
  const prevShown = useRef(shown)
  useEffect(() => {
    const from = prevShown.current
    prevShown.current = shown
    if (!open || from === shown) return
    const el = ref.current
    /* Found through the dialog rather than kept in a ref array: this runs
       once per push, and a live query is one line against a parallel list to
       keep in step with the children. */
    const pane = el?.querySelectorAll<HTMLElement>('.screen__pane')[shown]
    if (!el || !pane) return

    /* Movement is a state, and two things in screen.css need to know about
       it. The edge shadow, because a pane parked off-screen still casts one
       *into* the screen — 34px of grey down the right-hand side of Settings,
       permanently, for a detail that only means anything while the panes are
       actually passing each other. And will-change, which is a promise to
       keep a layer around and not one worth making for the 99% of the time
       nothing is moving. A timer rather than transitionend: two properties
       transition here and the pane that finishes last is not always the same
       one, so waiting on a specific event is more bookkeeping than the class
       is worth. */
    el.classList.add('screen--moving')
    const timer = setTimeout(() => el.classList.remove('screen--moving'), 520)

    if (shown > from) {
      const body = pane.querySelector<HTMLElement>('.screen__body')
      if (body) body.scrollTop = 0
    }
    pane.focus({ preventScroll: true })
    return () => clearTimeout(timer)
  }, [open, shown])

  return (
    <dialog
      ref={ref}
      className="screen"
      aria-labelledby={labelledBy}
      /* Escape, which for a <dialog> means "close the whole thing" and here
         must mean "go back one". Cancelling the default and routing it through
         the same dismiss the leading button uses keeps Escape, Android's Back
         and the button itself telling one story; the element is then only ever
         closed by the effect above, so its state can never drift out of sync
         with the history stack the way two independent sheets could. */
      onCancel={(e) => {
        e.preventDefault()
        onDismiss()
      }}
    >
      <div className="screen__panes">
        {panes.map((pane, i) => (
          <section
            key={i}
            className="screen__pane"
            tabIndex={-1}
            /* Off-screen is not out of reach: without this the pane behind
               keeps its tab stops and its screen-reader text, so Tab from the
               About pane walks into a Settings list nobody can see. */
            inert={i !== shown}
            style={
              {
                /* Whole screen widths for anything still to come, a fifth of
                   one for what is left behind. The two moving at different
                   rates is what reads as one surface sliding over another
                   rather than two slides sharing a track. */
                '--shift': i > shown ? (i - shown) * 100 : (i - shown) * 22,
                '--dim': i < shown ? 0.55 : 1,
              } as CSSProperties
            }
          >
            {pane}
          </section>
        ))}
      </div>
    </dialog>
  )
}

interface ScreenBarProps {
  /** Matches the Screen's labelledBy for this pane's depth. */
  id: string
  title: string
  /* 'close' on the root pane, 'back' on anything pushed above it. Both do the
     same thing — the difference is only what the user is promised, and an
     arrow on a screen with nothing behind it is a promise of a page that
     isn't there. */
  leading: 'close' | 'back'
  onDismiss: () => void
}

/* The bar belongs to the pane, not to the screen — so it travels with it.
 *
 * A shared bar whose title swapped as the panes moved underneath would put the
 * one word naming the screen on a different clock from the screen itself. This
 * way "Settings" leaves with the settings and "About" arrives with About, and
 * the back arrow that appears is plainly part of the thing it goes back from. */
export function ScreenBar({ id, title, leading, onDismiss }: ScreenBarProps) {
  return (
    <header className="screen__bar">
      {/* The bar rules the full width of the screen; what is *in* it lines up
          with the column below, so the arrow sits directly over the left edge
          of the first row instead of floating in the corner of a desktop
          window with 300px of nothing between it and the list it belongs to. */}
      <div className="screen__bar-inner">
        <button
          type="button"
          className="screen__lead"
          aria-label={leading === 'back' ? 'Back' : 'Close'}
          onClick={onDismiss}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {leading === 'back' ? (
              <path d="M19 12H5M11 5l-6 7 6 7" />
            ) : (
              <path d="M6 6l12 12M18 6 6 18" />
            )}
          </svg>
        </button>
        <h2 id={id} className="screen__title">
          {title}
        </h2>
      </div>
    </header>
  )
}
