import { useRef, useState } from 'react'
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  NP_MONTHS,
  NP_MONTHS_EN,
  NP_WEEKDAYS_FULL,
  adToBs,
  bsToAd,
  bsWeekday,
  daysInBsMonth,
  todayBs,
  toDevanagari,
} from '../../lib/calendar/nepaliDate'
import { ToolHeader } from '../ToolHeader'
import { tick } from '../../lib/haptics'
import './DateConverter.css'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** A Date → `yyyy-mm-dd`, in local time: what the AD field shows and what an
 *  <input type="date"> expects. */
function toInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* Converting the other way round is where a date input will quietly betray
   you: `new Date('2026-08-13')` parses as UTC midnight, which in a +05:45
   timezone is still the 13th but in any negative offset is the 12th. Building
   the Date from parts keeps it local, and local is what the whole calendar
   is reckoned in. */
function fromInputValue(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  /* new Date(2026, 1, 31) rolls over to 3 March rather than failing, so a
     typed 2026-02-31 would quietly become another date. Reject it instead. */
  if (Number.isNaN(d.getTime()) || d.getMonth() !== Number(m[2]) - 1) return null
  return d
}

/* What someone types into the AD field, shaped as they go: digits only, with
   the dashes put in for them, so "20261102" reads 2026-11-02. Devanagari
   digits count too. */
function shapeTyped(raw: string): string {
  const digits = raw
    .replace(/[०-९]/g, (c) => String(c.charCodeAt(0) - 0x0966))
    .replace(/\D/g, '')
    .slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

export function DateConverter() {
  const today = todayBs()
  const [bs, setBs] = useState({ year: today.year, month: today.month, day: today.day })

  const maxDay = daysInBsMonth(bs.year, bs.month)
  /* Clamped on read rather than on write. Switching from Asar (32 days) to
     Mangsir (29) with the 31st selected would otherwise ask the converter for
     a date that does not exist. */
  const safeDay = Math.min(bs.day, maxDay)
  const ad = bsToAd(bs.year, bs.month, safeDay)
  const weekday = bsWeekday(bs.year, bs.month, safeDay)
  const isToday = bs.year === today.year && bs.month === today.month && safeDay === today.day

  /* The AD field is text, always YYYY-MM-DD (1.9.98, owner's ask). It was an
     <input type="date">, which draws the date in the phone's own regional
     format, 11/02/2026 on one phone and 02/11/2026 on another, and a page
     cannot change that. A draft holds what is being typed until it is a
     whole, real date in the table's range; until then the field says it is
     not one yet, and leaving it puts the last good date back. */
  const [draft, setDraft] = useState<string | null>(null)
  const pickerRef = useRef<HTMLInputElement>(null)

  const setFromAd = (value: string): boolean => {
    const date = fromInputValue(value)
    if (!date) return false
    try {
      const next = adToBs(date)
      if (next.year < BS_MIN_YEAR || next.year > BS_MAX_YEAR) return false
      setBs(next)
      return true
    } catch {
      // Outside the conversion table — leave the last good value in place.
      return false
    }
  }
  const adShown = draft ?? toInputValue(ad)
  const draftBad = draft !== null && draft.length === 10

  /* The phone's own date picker is still one tap away, behind the calendar
     button: showPicker() on a date input kept out of sight. */
  const openPicker = () => {
    const el = pickerRef.current
    if (!el) return
    tick()
    try {
      if (typeof el.showPicker === 'function') el.showPicker()
      else el.click()
    } catch {
      el.focus()
    }
  }

  const years = []
  for (let y = BS_MIN_YEAR; y <= BS_MAX_YEAR; y++) years.push(y)

  return (
    <section className="conv" aria-labelledby="conv-title">
      <ToolHeader id="conv-title" ne="मिति परिवर्तन" en="BS ↔ AD date converter" />

      <div className="conv__row">
        <div className="conv__side">
          <span className="conv__label dev">बिक्रम सम्बत्</span>
          <div className="conv__bs">
            <label className="sr-only" htmlFor="conv-year">BS year</label>
            <select
              id="conv-year"
              className="conv__select dev"
              value={bs.year}
              onChange={(e) => setBs((b) => ({ ...b, year: Number(e.target.value) }))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{toDevanagari(y)}</option>
              ))}
            </select>

            <label className="sr-only" htmlFor="conv-month">BS month</label>
            <select
              id="conv-month"
              className="conv__select dev"
              value={bs.month}
              onChange={(e) => setBs((b) => ({ ...b, month: Number(e.target.value) }))}
            >
              {NP_MONTHS.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>

            <label className="sr-only" htmlFor="conv-day">BS day</label>
            <select
              id="conv-day"
              className="conv__select dev"
              value={safeDay}
              onChange={(e) => setBs((b) => ({ ...b, day: Number(e.target.value) }))}
            >
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{toDevanagari(d)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="conv__side">
          <label className="conv__label" htmlFor="conv-ad">Gregorian (AD)</label>
          <div className="conv__ad">
            <input
              id="conv-ad"
              type="text"
              className={`conv__date${draftBad ? ' conv__date--bad' : ''}`}
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="YYYY-MM-DD"
              maxLength={10}
              value={adShown}
              aria-invalid={draftBad}
              aria-describedby="conv-ad-format"
              onChange={(e) => {
                const shaped = shapeTyped(e.target.value)
                setDraft(shaped.length === 10 && setFromAd(shaped) ? null : shaped)
              }}
              onBlur={() => setDraft(null)}
            />
            <button
              type="button"
              className="btn btn--icon conv__pick"
              aria-label="Pick the AD date from a calendar"
              title="Pick from a calendar"
              onClick={openPicker}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </button>
            <input
              ref={pickerRef}
              type="date"
              className="conv__picker"
              tabIndex={-1}
              aria-hidden="true"
              value={toInputValue(ad)}
              onChange={(e) => {
                if (setFromAd(e.target.value)) setDraft(null)
              }}
            />
          </div>
          <span className="conv__format" id="conv-ad-format">
            {draftBad ? 'Not a valid date in this calendar’s range' : 'Year-month-day'}
          </span>
        </div>
      </div>

      {/* Both dates, one over the other — either can be the answer,
          depending on which side was just changed. */}
      <div className="conv__out">
        <div className="conv__out-text" aria-live="polite">
          <p className="conv__out-bs dev" lang="ne">
            {NP_WEEKDAYS_FULL[weekday]}, {NP_MONTHS[bs.month]} {toDevanagari(safeDay)}, {toDevanagari(bs.year)}
          </p>
          <p className="conv__out-ad">
            {/* Each date kept whole on a narrow line: YYYY-MM-DD otherwise broke
                at its own hyphen ("2026-11-" / "02"). */}
            {ad.toLocaleDateString('en-GB', { weekday: 'long' })}, <span className="conv__whole">{toInputValue(ad)}</span>
            <span className="conv__out-en">
              {' '}· <span className="conv__whole">{NP_MONTHS_EN[bs.month]} {safeDay}, {bs.year} BS</span>
            </span>
          </p>
        </div>
        {/* The date converter's clear: there is never an empty state to go
            back to — it always shows a date — so the way back is to today,
            and only once the dates have moved away from it. */}
        {!isToday && (
          <button
            type="button"
            className="btn conv__today"
            onClick={() => {
              tick()
              setBs({ year: today.year, month: today.month, day: today.day })
              // The button goes away with the click; keep focus in the tool.
              document.getElementById('conv-year')?.focus()
            }}
          >
            Today
          </button>
        )}
      </div>
    </section>
  )
}
