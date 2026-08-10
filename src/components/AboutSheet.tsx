import { useEffect, useRef } from 'react'
import type { Tab } from './TabSwitcher'
import { KEYWORDS } from '../data/keywords'
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
const SECTIONS: { id: Tab; label: string; rest: string; icon: 'type' | 'upload' | 'translate' }[] = [
  { id: 'type', icon: 'type', label: 'Type', rest: 'phonetic, as you already text' },
  { id: 'upload', icon: 'upload', label: 'Upload', rest: 'read text out of images & PDFs' },
  { id: 'translate', icon: 'translate', label: 'Translate', rest: 'EN ↔ NE, even offline' },
]

function SectionIcon({ name }: { name: 'type' | 'upload' | 'translate' }) {
  const props = {
    viewBox: '0 0 24 24',
    width: 18,
    height: 18,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  if (name === 'type') {
    return (
      <svg {...props}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    )
  }
  if (name === 'upload') {
    return (
      <svg {...props}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.5" />
        <path d="m4 17 4.5-4.5 3 3L15 12l5 5" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <path d="M4 7h9M4 7l3-3M4 7l3 3" />
      <path d="M20 17h-9M20 17l-3-3M20 17l-3 3" />
    </svg>
  )
}

export function AboutSheet({ open, onClose, onGoTo }: AboutSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)

  /* showModal() rather than the open attribute. It is what buys the focus
     trap, the inert background, the top-layer stacking (so the sheet clears
     the app bar and the mobile tab bar without a z-index argument) and
     Escape-to-close — none of which we then have to write or test. The
     attribute form gives you a non-modal box and none of that. */
  useEffect(() => {
    const el = ref.current
    if (!el) return
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
      onClose={onClose}
      /* Backdrop click. The ::backdrop pseudo-element is not an event target,
         so the click lands on the <dialog> itself — anything inside the panel
         stops at the panel, which is why the check is against currentTarget. */
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="about__panel glass sheen">
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

        {/* The Devanagari is wrapped in its own span so it is a single flex
            item. Left as a bare text node it became an anonymous flex item of
            its own, which cut the शिरोरेखा — the unbroken bar across the top of
            the word — and left a gap between ले and ख. */}
        <p className="about__wordmark" aria-hidden="true">
          <span className="about__mark">
            ले<span className="about__ink">ख</span>
          </span>
          <span className="about__latin">lekh</span>
        </p>

        <h2 id="about-title" className="about__headline dev-serif">
          सोच्नुहोस् अंग्रेजीमा,{' '}
          <span className="about__headline-accent">लेख्नुहोस् नेपालीमा।</span>
        </h2>
        <p className="about__sub">Think in English, write in Nepali — right in your browser.</p>

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
                <SectionIcon name={icon} />
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

        <p className="about__privacy">
          everything runs in your browser — nothing you type is ever sent anywhere
        </p>
        <p className="about__meta">
          © {new Date().getFullYear()} Bimesh Poudel · v{__APP_VERSION__}
        </p>
      </div>
    </dialog>
  )
}
