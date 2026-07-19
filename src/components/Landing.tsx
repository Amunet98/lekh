import type { Tab } from './TabSwitcher'
import './Landing.css'

interface LandingProps {
  onEnter: (tab?: Tab) => void
}

const FEATURES: { id: Tab; glyph: string; label: string; rest: string }[] = [
  { id: 'type', glyph: 'क', label: 'Type', rest: '— phonetic, as you text' },
  { id: 'upload', glyph: '🖼', label: 'Upload', rest: '— OCR images & PDFs' },
  { id: 'translate', glyph: '⇆', label: 'Translate', rest: '— EN ↔ NE, even offline' },
]

export function Landing({ onEnter }: LandingProps) {
  return (
    <div className="landing">
      <div className="landing__stage">
        <h1 className="landing__wordmark">
          ले<span className="landing__ink">ख</span>
        </h1>
        <svg className="landing__swash" viewBox="0 0 300 14" fill="none" aria-hidden="true">
          <path
            d="M4 9 C 80 2, 220 2, 296 8"
            stroke="var(--accent)"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity=".75"
          />
          <path
            d="M40 12 C 120 7, 200 7, 262 11"
            stroke="var(--accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity=".28"
          />
        </svg>
        <div className="landing__latin">lekh</div>

        <h2 className="landing__headline dev-serif">
          सोच्नुहोस् अंग्रेजीमा, <span className="landing__headline-accent">लेख्नुहोस् नेपालीमा।</span>
        </h2>
        <p className="landing__sub">Think in English, write in Nepali — right in your browser.</p>

        <div className="landing__demo" aria-hidden="true">
          <span className="landing__typed">
            kasto chha<span className="landing__caret" />
          </span>
          <span className="landing__arrow">→</span>
          <span className="landing__out dev">
            कस्तो <b>छ</b>
          </span>
        </div>

        <div className="landing__ctas">
          <button
            type="button"
            className="landing__btn landing__btn--primary"
            onClick={() => onEnter()}
          >
            <span className="dev">लेख्न थाल्नुहोस्</span> · Start writing
          </button>
        </div>

        <div className="landing__feats">
          {FEATURES.map(({ id, glyph, label, rest }) => (
            <button key={id} type="button" className="landing__feat" onClick={() => onEnter(id)}>
              <span className="landing__feat-glyph dev-serif" aria-hidden="true">
                {glyph}
              </span>
              <b>{label}</b>&nbsp;{rest}
            </button>
          ))}
        </div>
      </div>

      <footer className="landing__footer">
        <span className="landing__pilcrow">¶</span> everything runs in your browser — nothing you
        type is ever sent anywhere
      </footer>
    </div>
  )
}
