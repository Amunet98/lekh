import { useEffect, useRef } from 'react'
import type { Tab } from './TabSwitcher'
import { SectionIcon } from './SectionIcons'
import { LekhMark } from './LekhMark'
import { KEYWORDS } from '../data/keywords'
import { useHasAndroidApp } from '../hooks/useHasAndroidApp'
import { APK_URL, isAndroid } from '../lib/androidApp'
import { runtimeNoun } from '../lib/runtime'
import { useSheetDrag } from '../hooks/useSheetDrag'

import './SheetGrabber.css'
import './AboutSheet.css'

interface AboutSheetProps {
  open: boolean
  onClose: () => void
  /** Jump to a section. Closing is the caller's job — see App.tsx. */
  onGoTo: (tab: Tab) => void
}

/* Carried over from the old first-visit Landing page, which this sheet
   replaces. The glyph column used to be 'क' / '🖼' / '⇆' — an emoji sitting
   between two typographic marks, at the mercy of whatever the platform
   decided a picture frame looks like. They are inline SVG now, drawn on the
   same 24-box and stroke weight as the tab bar icons. */
const SECTIONS: { id: Tab; label: string; rest: string; icon: Tab }[] = [
  { id: 'type', icon: 'type', label: 'Type', rest: 'phonetic, as you already text' },
  { id: 'translate', icon: 'translate', label: 'Translate', rest: 'EN ↔ NE, even offline — type it or drop in a photo/PDF' },
  { id: 'calendar', icon: 'calendar', label: 'Patro', rest: 'Bikram Sambat, festivals & holidays' },
]


export function AboutSheet({ open, onClose, onGoTo }: AboutSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const android = isAndroid()
  const hasApp = useHasAndroidApp()

  // Drag-to-dismiss — only engages on the mobile bottom-sheet layout (see
  // .about__grabber's own media query below at the same 560px breakpoint the
  // bottom-sheet conversion already uses); the desktop centered card keeps
  // the plain X, since dragging isn't a natural gesture for a floating card.
  const drag = useSheetDrag(ref, panelRef, onClose)

  /* showModal() rather than the open attribute. It is what buys the focus
     trap, the inert background, the top-layer stacking (so the sheet clears
     the app bar and the mobile tab bar without a z-index argument) and
     Escape-to-close — none of which we then have to write or test. The
     attribute form gives you a non-modal box and none of that. */
  useEffect(() => {
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
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="about"
      aria-labelledby="about-title"
      /* Fires for Escape and for close() alike, so the parent's state can
         never drift out of sync with the element's own open flag. */
      onClose={() => {
        drag.reset()
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
        className={`about__panel${drag.isDragging ? ' about__panel--dragging' : ''}`}
        style={{ transform: `translateY(${drag.dragY}px)` }}
        onTransitionEnd={drag.handlePanelTransitionEnd}
      >
        {/* Mobile bottom-sheet only (see .about__grabber's media query) — a
            plain click closes it like any button, keeping this operable for
            keyboard/AT users who can't drag; dragging or flinging it down
            closes it too, which is the whole point of a grabber over an X. */}
        <button
          type="button"
          className={`sheet-grabber about__grabber${drag.isDragging ? ' sheet-grabber--dragging' : ''}`}
          aria-label="Close"
          onClick={drag.handleGrabberClick}
          onPointerDown={drag.handleGrabberPointerDown}
          onPointerMove={drag.handleGrabberPointerMove}
          onPointerUp={drag.handleGrabberPointerEnd}
          onPointerCancel={drag.handleGrabberPointerEnd}
        >
          <span className="sheet-grabber-bar" aria-hidden="true" />
        </button>
        <button type="button" className="about__close" aria-label="Close" onClick={onClose}>
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

        {/* The mark is wrapped in its own span so it is a single flex item.
            Left as a bare text node it became an anonymous flex item of its
            own, which cuts the शिरोरेखा — see LekhMark. */}
        <p className="about__wordmark" aria-hidden="true">
          <span className="about__mark">
            <LekhMark inkClassName="about__ink" />
          </span>
          <span className="about__slash" aria-hidden="true">
            /
          </span>
          <span className="about__patro">पात्रो</span>
        </p>

        <h2 id="about-title" className="about__headline dev-serif">
          सोच्नुहोस् अंग्रेजीमा,{' '}
          <span className="about__headline-accent">लेख्नुहोस् नेपालीमा।</span>
        </h2>
        <p className="about__sub">Think in English, write in Nepali — right in your {runtimeNoun()}.</p>

        <div className="about__demo" aria-hidden="true">
          <span className="about__typed">
            kasto chha<span className="about__caret" />
          </span>
          <span className="about__arrow">→</span>
          <span className="about__out dev">
            कस्तो <b>छ</b>
          </span>
        </div>

        <div className="about__sections">
          {SECTIONS.map(({ id, icon, label, rest }) => (
            <button key={id} type="button" className="about__section" onClick={() => onGoTo(id)}>
              <span className="about__section-icon">
                <SectionIcon name={icon} size={18} />
              </span>
              <span className="about__section-text">
                <b>{label}</b>
                <span className="about__section-rest">{rest}</span>
              </span>
              <span className="about__section-go" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>

        <ul className="about__keywords">
          {KEYWORDS.map(({ term, dev }) => (
            <li key={term} className="about__keyword">
              {term}
              {dev && <span className="dev about__keyword-dev">{dev}</span>}
            </li>
          ))}
        </ul>

        {/* Android only. The APK is the one build that carries the home-screen
            widget, which the web app cannot provide at all — so on any other
            platform this row would advertise something the visitor cannot use.
            A userAgent test is the right tool here: what decides this is the
            OS, not the screen.

            hasApp is the other half: this row kept offering the download from
            inside the installed app, and from a browser tab on a phone that
            already had it. Both are the same mistake — advertising something
            the visitor already owns. */}
        {android && !hasApp && (
          <a className="about__apk" href={APK_URL} target="_blank" rel="noopener noreferrer">
            <span className="about__apk-main">Get the Android app</span>
            <span className="about__apk-sub">
              the only version with the <span className="dev">पात्रो</span> home-screen widget ·
              ~1&nbsp;MB. Installing from Chrome&rsquo;s own menu instead gives you the app
              without the widget.
            </span>
          </a>
        )}

        {/* A row, not a footer link.
            
            This lived in a footer for exactly one version. A footer is a
            website convention — apps put this behind an info or settings icon,
            as a row — and no amount of restyling hides that a rule with a
            centred link under the content is a web page.
            
            The subtitle is the honest short version. It used to read "nothing
            you type is ever sent anywhere", which online translation makes
            false; typing, OCR and the calendar genuinely are local, and the
            page one tap away lists the four things that are not. */}
        <a className="about__section about__section--aside" href="/privacy.html">
          <span className="about__section-icon">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3.5 5 6.2v5c0 4.2 2.8 7.5 7 9.3 4.2-1.8 7-5.1 7-9.3v-5Z" />
            </svg>
          </span>
          <span className="about__section-text">
            <b>Privacy</b>
            {/* Kept to the length of the four rows above ("Bikram Sambat,
                festivals & holidays") so it sits on one line at 390px and the
                block keeps one rhythm. */}
            <span className="about__section-rest">typing, OCR and calendar stay local</span>
          </span>
          <span className="about__section-go" aria-hidden="true">
            →
          </span>
        </a>

        {/* The byline the footer used to carry. It belongs here: a footer line
            under a typing app is read by nobody, whereas someone who opened
            "About" is asking exactly this question. */}
        <p className="about__by">
          Built by{' '}
          <a href="https://bimeshpoudel.com.np" target="_blank" rel="noopener noreferrer">
            Bimesh Poudel
          </a>
        </p>
        {/* "web build," not "v" — this is __APP_VERSION__ from package.json,
            which bumps on every commit including web-only ones that never
            touch android/ and so never ship a new Play Store release. On
            Android that number and the version Play Store shows for the
            installed app (which only moves when a new APK/AAB is actually
            uploaded) drift apart within hours of any web-only fix — both
            numbers are correct, they're just answering different questions,
            and an unlabelled "v1.8.20" here next to a Play Store listing that
            still says 1.8.18 reads as a bug instead of the two intentionally
            different things they are. */}
        <p className="about__meta">
          <span className="dev">लेख</span> Lekh Patro · web build {__APP_VERSION__} · ©{' '}
          {new Date().getFullYear()}
        </p>
      </div>
    </dialog>
  )
}
