import { useState } from 'react'
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
import './DateConverter.css'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** A Date → the `yyyy-mm-dd` an <input type="date"> expects, in local time. */
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
  return Number.isNaN(d.getTime()) ? null : d
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

  const setFromAd = (value: string) => {
    const date = fromInputValue(value)
    if (!date) return
    try {
      const next = adToBs(date)
      if (next.year < BS_MIN_YEAR || next.year > BS_MAX_YEAR) return
      setBs(next)
    } catch {
      // Outside the conversion table — leave the last good value in place.
    }
  }

  const years = []
  for (let y = BS_MIN_YEAR; y <= BS_MAX_YEAR; y++) years.push(y)

  return (
    <div className="conv">
      <h2 className="conv__title">
        <span className="dev">मिति परिवर्तन</span> · date converter
      </h2>

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
          {/* A real date input, so mobile gets the native picker and the
              keyboard that goes with it rather than three more dropdowns. */}
          <input
            id="conv-ad"
            type="date"
            className="conv__date"
            value={toInputValue(ad)}
            onChange={(e) => setFromAd(e.target.value)}
          />
        </div>
      </div>

      <p className="conv__out" aria-live="polite">
        <span className="dev">
          {NP_MONTHS[bs.month]} {toDevanagari(safeDay)}, {toDevanagari(bs.year)}
        </span>
        {' = '}
        {ad.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        {' · '}
        <span className="dev">{NP_WEEKDAYS_FULL[weekday]}</span>
        <span className="conv__out-en"> ({NP_MONTHS_EN[bs.month]})</span>
      </p>
    </div>
  )
}
