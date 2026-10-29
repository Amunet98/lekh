import { useLayoutEffect, useRef, useState } from 'react'
import { ActionSheet } from '../ActionSheet'
import { BS_MAX_YEAR, BS_MIN_YEAR, NP_MONTHS, NP_MONTHS_EN, toDevanagari } from '../../lib/calendar/nepaliDate'
import { tick } from '../../lib/haptics'
import './MonthPicker.css'

interface MonthPickerProps {
  open: boolean
  onClose: () => void
  /** The month on screen, which the sheet opens at. */
  view: { year: number; month: number }
  today: { year: number; month: number }
  onPick: (year: number, month: number) => void
}

const YEARS = Array.from({ length: BS_MAX_YEAR - BS_MIN_YEAR + 1 }, (_, i) => BS_MIN_YEAR + i)

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

/* Straight to any month, instead of paging there one at a time — BS 2050 was
   32 taps of the arrow from today.
 *
 * Opens on the twelve months of the year on screen, because most jumps stay
 * inside it (to Asoj for Dashain, to Kartik for Tihar). A year a few away is
 * the arrows beside it; a year decades away is a tap on the year itself,
 * which swaps the months for every year the calendar knows, scrolled to the
 * current one. The same two-level shape as Android's own date picker, so it
 * is the one a phone user already knows. */
export function MonthPicker({ open, onClose, view, today, onPick }: MonthPickerProps) {
  const [year, setYear] = useState(view.year)
  const [choosingYear, setChoosingYear] = useState(false)
  const yearsRef = useRef<HTMLDivElement>(null)

  /* Every opening starts from the month on screen, not from wherever the last
     visit left off. Adjusted during render — React's pattern for resetting
     state on a prop change — so the first painted frame is already right. */
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setYear(view.year)
      setChoosingYear(false)
    }
  }

  // The year list opens on the chosen year, not on 2000.
  useLayoutEffect(() => {
    if (!choosingYear) return
    yearsRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: 'center' })
  }, [choosingYear])

  return (
    <ActionSheet open={open} onClose={onClose} label="Go to a month">
      <div className="month-picker">
        <div className="month-picker__head">
          <button
            type="button"
            className="month-picker__step"
            aria-label="Previous year"
            disabled={choosingYear || year <= BS_MIN_YEAR}
            onClick={() => setYear((y) => y - 1)}
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            className="month-picker__year"
            aria-expanded={choosingYear}
            aria-label={choosingYear ? `Year ${year}, choose a month instead` : `Year ${year}, choose another year`}
            onClick={() => setChoosingYear((c) => !c)}
          >
            <span className="dev" lang="ne">{toDevanagari(year)}</span>
            <span className="month-picker__latin">{year}</span>
            <svg className={`month-picker__caret${choosingYear ? ' month-picker__caret--up' : ''}`}
                 viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="month-picker__step"
            aria-label="Next year"
            disabled={choosingYear || year >= BS_MAX_YEAR}
            onClick={() => setYear((y) => y + 1)}
          >
            <Chevron dir="right" />
          </button>
        </div>

        {choosingYear ? (
          <div ref={yearsRef} className="month-picker__grid month-picker__grid--years" role="group" aria-label="Years">
            {YEARS.map((y) => (
              <button
                key={y}
                type="button"
                className={
                  'month-picker__cell' +
                  (y === today.year ? ' month-picker__cell--now' : '') +
                  (y === year ? ' month-picker__cell--on' : '')
                }
                aria-pressed={y === year}
                aria-label={String(y)}
                onClick={() => {
                  tick()
                  setYear(y)
                  setChoosingYear(false)
                }}
              >
                <span className="dev" lang="ne">{toDevanagari(y)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="month-picker__grid" role="group" aria-label={`Months of ${year}`}>
            {NP_MONTHS.map((name, m) => {
              const isView = year === view.year && m === view.month
              const isNow = year === today.year && m === today.month
              return (
                <button
                  key={name}
                  type="button"
                  className={
                    'month-picker__cell' +
                    (isNow ? ' month-picker__cell--now' : '') +
                    (isView ? ' month-picker__cell--on' : '')
                  }
                  aria-pressed={isView}
                  aria-current={isNow ? 'date' : undefined}
                  aria-label={`${NP_MONTHS_EN[m]} ${year}`}
                  onClick={() => {
                    tick()
                    onPick(year, m)
                    onClose()
                  }}
                >
                  <span className="dev" lang="ne">{name}</span>
                  <span className="month-picker__latin">{NP_MONTHS_EN[m]}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </ActionSheet>
  )
}
