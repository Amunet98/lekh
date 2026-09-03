import type { Tab } from './TabSwitcher'
import { SectionIcon } from './SectionIcons'
import { LekhMark } from './LekhMark'
import { KEYWORDS } from '../data/keywords'
import { useHasAndroidApp } from '../hooks/useHasAndroidApp'
import { APK_URL, isAndroid } from '../lib/androidApp'
import { ScreenBar } from './Screen'

import './sheet.css'
import './AboutScreen.css'

interface AboutScreenProps {
  /* One level back, which from this pane means returning to Settings — the
     pane it was pushed from, still mounted and still where the user left it. */
  onDismiss: () => void
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


export function AboutScreen({ onDismiss, onGoTo }: AboutScreenProps) {
  const android = isAndroid()
  const hasApp = useHasAndroidApp()

  return (
    <>
      <ScreenBar id="about-title" title="About" leading="back" onDismiss={onDismiss} />
      <div className="screen__body">
        <div className="screen__content about">
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

          {/* A tagline, not a heading — the bar above says "About", and two
              headings for one pane is one more than a screen reader needs. */}
          <p className="about__headline dev-serif">
            सोच्नुहोस् अंग्रेजीमा,{' '}
            <span className="about__headline-accent">लेख्नुहोस् नेपालीमा।</span>
          </p>
          <p className="about__sub">Think in English, write in Nepali — right on your device.</p>

          <div className="about__demo" aria-hidden="true">
            <span className="about__typed">
              kasto chha<span className="about__caret" />
            </span>
            <span className="about__arrow">→</span>
            <span className="about__out dev">
              कस्तो <b>छ</b>
            </span>
          </div>

          <div className="sheet-rows">
            {SECTIONS.map(({ id, icon, label, rest }) => (
              <button key={id} type="button" className="sheet-row" onClick={() => onGoTo(id)}>
                <span className="sheet-row__icon">
                  <SectionIcon name={icon} size={18} />
                </span>
                <span className="sheet-row__text">
                  <b>{label}</b>
                  <span className="sheet-row__rest">{rest}</span>
                </span>
                <span className="sheet-row__go" aria-hidden="true">
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

              hasApp is the other half, and it covers exactly one case: this
              row kept offering the download from inside the installed app.
              It does NOT catch a browser tab on a phone that already has the
              APK — see the note on the same guard in InstallButton.tsx, which
              this row deliberately mirrors: same policy, same conditions, so
              the header button and this row can never disagree about what
              Android is offered. */}
          {android && !hasApp && (
            <a className="about__apk" href={APK_URL} target="_blank" rel="noopener noreferrer">
              <span className="about__apk-main">Get the Android app (.apk)</span>
              <span className="about__apk-sub">
                Downloads a ~23&nbsp;MB .apk file directly — the only version with the{' '}
                <span className="dev">पात्रो</span> home-screen widget.
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
          <a className="sheet-row sheet-row--aside" href="/privacy.html">
            <span className="sheet-row__icon">
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
            <span className="sheet-row__text">
              <b>Privacy</b>
              {/* Kept to the length of the four rows above ("Bikram Sambat,
                  festivals & holidays") so it sits on one line at 390px and the
                  block keeps one rhythm. */}
              <span className="sheet-row__rest">typing, OCR and calendar stay local</span>
            </span>
            <span className="sheet-row__go" aria-hidden="true">
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
      </div>
    </>
  )
}
