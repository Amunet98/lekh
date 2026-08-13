import { useMemo, useState } from 'react'
import {
  NP_MONTHS,
  NP_MONTHS_EN,
  NP_WEEKDAYS_SHORT,
  NP_WEEKDAYS_FULL,
  SATURDAY,
  SUNDAY,
  adSpanLabel,
  bsToAd,
  bsWeekday,
  daysInBsMonth,
  isSameBsDate,
  isWeeklyOff,
  monthHasSundayOff,
  stepMonth,
  todayBs,
  toDevanagari,
  type BsDate,
} from '../../lib/calendar/nepaliDate'
import { COVERAGE, getMonthPanchang, hasPanchang } from '../../lib/calendar/panchang'
import { DateConverter } from './DateConverter'
import './CalendarPage.css'

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

/* Local date, never toISOString(). The converter hands back a Date at local
   midnight, and this machine sits at +05:45 — reading it back as UTC moves
   every festival a day earlier, which is exactly the silent one-day error
   this whole feature is trying not to make. */
function formatAd(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function CalendarPage() {
  const today = useMemo(() => todayBs(), [])
  const [view, setView] = useState({ year: today.year, month: today.month })
  const [selected, setSelected] = useState<BsDate>(today)

  const monthLength = daysInBsMonth(view.year, view.month)
  const leadingBlanks = bsWeekday(view.year, view.month, 1)
  const panchang = getMonthPanchang(view.year, view.month)
  const covered = hasPanchang(view.year)
  const sundayOff = monthHasSundayOff(view.year, view.month)

  const goto = (delta: number) => {
    const next = stepMonth(view.year, view.month, delta)
    setView(next)
  }

  /* Named holidays only. The source flags a lot of bare weekend days as
     holidays — inconsistently, at that: 29 of 53 Saturdays in BS 2081 but 48
     of 52 in BS 2082 — which filled this list with unnamed rows and buried the
     festivals among them. The weekly pattern is drawn by rule in the grid
     (see isWeeklyOff), so the list is for the days you would not otherwise
     know about: the ones with a name. */
  const namedHolidays = useMemo(
    () => (panchang?.holidays ?? []).filter((h) => h.names.length > 0),
    [panchang],
  )

  const selectedAd = bsToAd(selected.year, selected.month, selected.day)
  const selectedInfo = getMonthPanchang(selected.year, selected.month)?.byDay.get(selected.day)
  const selectedWeekday = bsWeekday(selected.year, selected.month, selected.day)

  return (
    <section className="cal">
      <h1 className="sr-only">Nepali calendar</h1>

      <div className="cal__nav">
        <button type="button" className="cal__arrow" aria-label="Previous month" onClick={() => goto(-1)}>
          <ChevronIcon dir="left" />
        </button>

        <div className="cal__title">
          <h2 className="cal__month dev">
            {NP_MONTHS[view.month]} {toDevanagari(view.year)}
          </h2>
          <p className="cal__sub">
            {NP_MONTHS_EN[view.month]} · {adSpanLabel(view.year, view.month)}
          </p>
        </div>

        <button type="button" className="cal__arrow" aria-label="Next month" onClick={() => goto(1)}>
          <ChevronIcon dir="right" />
        </button>
      </div>

      {/* Only offered when it would do something — on the current month it is
          a button that visibly does nothing, which reads as broken. */}
      {(view.year !== today.year || view.month !== today.month) && (
        <button
          type="button"
          className="cal__today-btn"
          onClick={() => {
            setView({ year: today.year, month: today.month })
            setSelected(today)
          }}
        >
          <span className="dev">आज</span> · today
        </button>
      )}

      <div className="cal__grid" role="grid" aria-label={`${NP_MONTHS_EN[view.month]} ${view.year}`}>
        <div className="cal__weekdays" role="row">
          {NP_WEEKDAYS_SHORT.map((d, i) => {
            /* Sunday is highlighted only for months the two-day weekend
               actually covers, so paging back to 2081 shows the week as it
               was rather than as it is now. */
            const off = i === SATURDAY || (i === SUNDAY && sundayOff)
            return (
              <span
                key={d}
                role="columnheader"
                className={`cal__weekday dev${off ? ' cal__weekday--off' : ''}`}
                aria-label={NP_WEEKDAYS_FULL[i]}
              >
                {d}
              </span>
            )
          })}
        </div>

        <div className="cal__days" role="rowgroup">
          {/* Inert spacers for the days before the 1st. aria-hidden so a screen
              reader walks straight from the header to the first real date. */}
          {Array.from({ length: leadingBlanks }, (_, i) => (
            <span key={`blank-${i}`} className="cal__cell cal__cell--blank" aria-hidden="true" />
          ))}

          {Array.from({ length: monthLength }, (_, i) => {
            const day = i + 1
            const info = panchang?.byDay.get(day)
            const weekday = (leadingBlanks + i) % 7
            const isToday = isSameBsDate(today, { year: view.year, month: view.month, day })
            const isSelected = isSameBsDate(selected, { year: view.year, month: view.month, day })
            /* Two independent reasons a day is off: the weekly pattern (a
               rule, and one that changed in Chaitra 2082 — see isWeeklyOff)
               and a declared or festival holiday from the tabulated data. */
            const weeklyOff = isWeeklyOff({ year: view.year, month: view.month, day }, weekday)
            const off = info?.isHoliday || weeklyOff
            const ad = bsToAd(view.year, view.month, day)

            const label = [
              `${NP_WEEKDAYS_FULL[weekday]} ${day} ${NP_MONTHS_EN[view.month]} ${view.year}`,
              formatAd(ad),
              info?.tithi,
              info?.festivals.join(', '),
              info?.isHoliday ? 'public holiday' : '',
              weeklyOff ? 'weekly day off' : '',
            ].filter(Boolean).join(' — ')

            return (
              <button
                key={day}
                type="button"
                role="gridcell"
                aria-label={label}
                aria-current={isToday ? 'date' : undefined}
                aria-pressed={isSelected}
                className={
                  'cal__cell' +
                  (off ? ' cal__cell--off' : '') +
                  (isToday ? ' cal__cell--today' : '') +
                  (isSelected ? ' cal__cell--selected' : '')
                }
                onClick={() => setSelected({ year: view.year, month: view.month, day })}
              >
                <span className="cal__bs dev">{toDevanagari(day)}</span>
                <span className="cal__ad">{ad.getDate()}</span>
                {/* A dot, not the name — at seven columns on a 360px screen
                    there is no room for text, and a truncated festival name is
                    worse than a mark that says "tap me". */}
                {info && info.festivals.length > 0 && <span className="cal__dot" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* The detail panel. This is where a festival name actually gets read,
          which is what lets the grid cells stay as numerals and a dot. */}
      <div className="cal__detail" aria-live="polite">
        <p className="cal__detail-date">
          <span className="dev">
            {NP_MONTHS[selected.month]} {toDevanagari(selected.day)}, {NP_WEEKDAYS_FULL[selectedWeekday]}
          </span>
        </p>
        <p className="cal__detail-ad">
          {formatAd(selectedAd)}
          {selectedInfo?.tithi && <> · <span className="dev">{selectedInfo.tithi}</span></>}
        </p>
        {selectedInfo && selectedInfo.festivals.length > 0 ? (
          <ul className="cal__detail-fest">
            {selectedInfo.festivals.map((f) => (
              <li key={f} className="dev">{f}</li>
            ))}
          </ul>
        ) : (
          <p className="cal__detail-none">
            {covered ? 'No festival listed for this day.' : 'Festival data is not available for this year.'}
          </p>
        )}
      </div>

      {/* Coverage, stated rather than implied. An uncovered month must say so:
          rendering it as a month that simply has no festivals in it would be a
          lie the user has no way to detect. */}
      {!covered ? (
        <p className="cal__coverage cal__coverage--warn" role="note">
          Dates convert for any year, but festivals and holidays are only listed for{' '}
          <b>BS {toDevanagari(COVERAGE.from)}–{toDevanagari(COVERAGE.to)}</b>. Most Nepali festivals
          fall on a lunar tithi and cannot be derived from the date alone, so they are tabulated
          rather than calculated.
        </p>
      ) : (
        panchang && (
          <div className="cal__holidays">
            <h2 className="cal__holidays-title">
              <span className="dev">यो महिनाका बिदा</span> · public holidays
            </h2>
            {namedHolidays.length === 0 ? (
              <p className="cal__detail-none">
                No named holiday this month — only the weekly {sundayOff ? 'Saturdays and Sundays' : 'Saturdays'}.
              </p>
            ) : (
              <ul>
                {namedHolidays.map(({ day, names }) => (
                  <li key={day}>
                    <button
                      type="button"
                      className="cal__holiday-row"
                      onClick={() => setSelected({ year: view.year, month: view.month, day })}
                    >
                      <span className="cal__holiday-day dev">{toDevanagari(day)}</span>
                      <span className="cal__holiday-name dev">{names.join(', ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}

      <DateConverter />
    </section>
  )
}
