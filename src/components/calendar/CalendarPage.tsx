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
import { COVERAGE } from '../../lib/calendar/panchang'
import { useMonthPanchang } from '../../hooks/useMonthPanchang'
import { DateConverter } from './DateConverter'
import { ActionSheet } from '../ActionSheet'
import { saveFile } from '../../lib/download'
import { openCalendarEvent } from '../../lib/calendarEvent'
import { isNativeApp } from '../../lib/androidApp'
import { tick } from '../../lib/haptics'
import { useToast } from '../../hooks/useToast'
import './CalendarPage.css'

function ChevronIcon({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  )
}

function ConvertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h13M17 8l-3-3M17 8l-3 3" />
      <path d="M20 16H7M7 16l3-3M7 16l3 3" />
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

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// Local calendar components, not toISOString — the same one-day trap as
// formatAd above: reading a local-midnight Date back as UTC can shift the
// date it names.
function icsDate(date: Date): string {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`
}

// DTSTAMP is a real UTC instant (when the file was generated), not a
// calendar date, so toISOString is the correct tool here rather than the
// trap it is for icsDate above.
function icsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
}

function downloadIcs(names: string[], date: Date) {
  const end = new Date(date)
  end.setDate(end.getDate() + 1)
  const uid = `${icsDate(date)}-${Math.random().toString(36).slice(2)}@lekh-patro`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lekh Patro//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART;VALUE=DATE:${icsDate(date)}`,
    `DTEND;VALUE=DATE:${icsDate(end)}`,
    `SUMMARY:${icsEscape(names.join(', '))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  // saveFile, not an <a download>: that click is dropped silently by the
  // Android WebView, so this button did nothing at all inside the app.
  return saveFile(blob, 'lekh-patro-holiday.ics')
}

interface CalendarPageProps {
  /* The date converter is a sheet off the month bar rather than the last
     block of the page — see the Sheet union in useAppNavigation for why it is
     history and not local state. */
  converterOpen: boolean
  onOpenConverter: () => void
  onCloseConverter: () => void
}

/* Who a holiday is actually for, set as the aside it is.
 *
 * A third of this month's list reads like
 * `गाईजात्रा (सापारू)(काठमाडौं उपत्यकालाई र देशभरका नेवार समुदायका लागि मात्र बिदा)`
 * — a festival name followed by an eligibility note in parentheses, up to 94
 * characters of it, all at one weight. On a phone that is three wrapped lines
 * of identical grey where the part being looked for (which festival is it?)
 * is the first two words.
 *
 * The note is dimmed in place rather than moved, and that restraint is the
 * whole design. These strings are not structured: the parenthetical lands
 * mid-name as often as at the end (`गौरा पर्व(…)काय अष्टमी, कागेश्वर मेला`),
 * a handful of entries carry two of them, and three run off the end of the
 * string without ever closing one — upstream truncation that splitTopLevel in
 * panchang.ts already documents. Lifting the note out to its own line would
 * mean deciding which text is the name, and every rule for that is wrong on
 * some row in this file. Changing only the weight cannot be wrong on any of
 * them: the text stays whole, in its original order, and an unclosed paren
 * simply never matches and renders exactly as it does today.
 *
 * Not aria-hidden, and not a title: it is part of the holiday's name to a
 * screen reader, and dropping it would leave "गाईजात्रा" read out as a
 * national holiday to the people least able to check. */
function FestivalName({ name }: { name: string }) {
  /* Captured group, so the parentheses come back in the array rather than
     being thrown away with the separator. */
  const parts = name.split(/(\([^)]*\))/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('(') && part.endsWith(')') ? (
          <span key={i} className="cal__holiday-note">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

export function CalendarPage({ converterOpen, onOpenConverter, onCloseConverter }: CalendarPageProps) {
  const toast = useToast()
  const today = useMemo(() => todayBs(), [])
  const [view, setView] = useState({ year: today.year, month: today.month })
  const [selected, setSelected] = useState<BsDate>(today)

  const monthLength = daysInBsMonth(view.year, view.month)
  const leadingBlanks = bsWeekday(view.year, view.month, 1)
  const { month: panchang, source, loading } = useMonthPanchang(view.year, view.month)
  const covered = panchang !== null
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
  /* Read from the month currently on screen rather than re-deriving. Selecting
     a day always happens inside the visible month, and going back to the data
     layer for it would miss a live refresh that has landed here. */
  const selectedInfo =
    selected.year === view.year && selected.month === view.month
      ? panchang?.byDay.get(selected.day)
      : undefined
  const selectedWeekday = bsWeekday(selected.year, selected.month, selected.day)
  const todayWeekday = bsWeekday(today.year, today.month, today.day)

  return (
    <section className="cal">
      <h1 className="sr-only">Nepali calendar</h1>

      <div className="cal__nav">
        <button type="button" className="cal__arrow" aria-label="Previous month" onClick={() => goto(-1)}>
          <ChevronIcon dir="left" />
        </button>

        <div className="cal__title">
          <div className="cal__title-row">
            <h2 className="cal__month dev">
              {NP_MONTHS[view.month]} {toDevanagari(view.year)}
            </h2>
            <p className="cal__sub">
              {NP_MONTHS_EN[view.month]} · {adSpanLabel(view.year, view.month)}
            </p>
          </div>
          {/* Today, in the one place that stays on screen. The bar names the
              month being looked at, which stops being this month the moment
              you page; this line does not move with it. Short weekday names,
              the same ones as the grid header. */}
          <p className="cal__today dev">
            आज {NP_WEEKDAYS_SHORT[todayWeekday]}, {NP_MONTHS[today.month]} {toDevanagari(today.day)}
          </p>
        </div>

        {/* Two controls on this side and one on the other, which is why the
            bar is a three-column grid with equal outer tracks (see the CSS):
            the month stays optically centred whatever hangs off the ends. */}
        <div className="cal__nav-end">
          <button type="button" className="cal__arrow" aria-label="Next month" onClick={() => goto(1)}>
            <ChevronIcon dir="right" />
          </button>
          <button
            type="button"
            className="cal__arrow cal__arrow--convert"
            aria-haspopup="dialog"
            aria-label="Date converter"
            title="Date converter"
            onClick={onOpenConverter}
          >
            <ConvertIcon />
          </button>
        </div>
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
                  /* Separate from --off on purpose: --off makes the numeral
                     red, weekends included, and --holiday adds the fill. See
                     the note on .cal__cell--holiday for why the two stopped
                     being one.

                     Named holidays only — the same filter namedHolidays uses
                     above, and for the same reason it gives: the source flags
                     a lot of bare weekend days as holidays, inconsistently.
                     While every off-day was tinted identically that did not
                     show; now that the fill means "holiday" it has to mean the
                     same thing the list underneath means, or the month tints
                     days the list does not explain. Measured on भदौ २०८३: ६,
                     २० and २७ were filled with nothing to look up. */
                  (info?.isHoliday && info.festivals.length > 0
                    ? ' cal__cell--holiday'
                    : '') +
                  (isToday ? ' cal__cell--today' : '') +
                  (isSelected ? ' cal__cell--selected' : '')
                }
                onClick={() => {
                tick()
                setSelected({ year: view.year, month: view.month, day })
              }}
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
          <>
            <ul className="cal__detail-fest">
              {/* The same treatment the month list gets — see FestivalName.
                  It was applied there and not here, so one screen dimmed the
                  "only for X employees" clause and the other set it in full
                  strength two inches away. */}
              {selectedInfo.festivals.map((f) => (
                <li key={f} className="dev">
                  <FestivalName name={f} />
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn cal__detail-add"
              /* In the app this opens the calendar's own new-event screen
                 (CalendarIntentPlugin). The .ics is the fallback for the web,
                 for an APK too old to carry that plugin, and for a phone with
                 no calendar app — and there the split is the usual one: the
                 app's share sheet announces itself, a web download does not. */
              onClick={() =>
                void openCalendarEvent(selectedInfo.festivals.join(', '), selectedAd)
                  .then((opened) => {
                    if (opened) return
                    return downloadIcs(selectedInfo.festivals, selectedAd).then(() => {
                      if (!isNativeApp()) toast.done('Saved lekh-patro-holiday.ics')
                    })
                  })
                  .catch((err: unknown) =>
                    toast.problem(
                      err instanceof Error && err.message.includes('update it')
                        ? err.message
                        : 'Could not save the calendar file',
                    ),
                  )
              }
            >
              Add to calendar
            </button>
          </>
        ) : (
          <p className="cal__detail-none">
            {loading
              ? 'Checking for festival data…'
              : covered
                ? 'No festival listed for this day.'
                : 'Festival data is not available for this month.'}
          </p>
        )}
      </div>

      {/* Coverage, stated rather than implied. An uncovered month must say so:
          rendering it as a month that simply has no festivals in it would be a
          lie the user has no way to detect. */}
      {!covered ? (
        <div className="cal__coverage cal__coverage--warn" role="note">
          {loading ? (
            'Looking for festival data for this month…'
          ) : (
            <>
              {/* The claim itself stays in the open. A month with no festivals
                  in it and a month whose festivals could not be loaded look
                  identical, so saying so is not documentation — it is the only
                  thing standing between the user and a silent lie. Why it
                  works that way is documentation, and goes behind the
                  summary. */}
              Dates convert for any year, but festivals could not be loaded for this month.
              Built-in data covers{' '}
              <b>BS {toDevanagari(COVERAGE.from)}–{toDevanagari(COVERAGE.to)}</b>; anything
              outside that needs a connection the first time.
              <details className="disclosure cal__coverage-why">
                <summary>
                  <span className="disclosure__caret">
                    <ChevronIcon dir="right" />
                  </span>
                  Why festivals need loading at all
                </summary>
                <p>
                  Most Nepali festivals fall on a lunar tithi and cannot be derived from the date
                  alone, so they are tabulated rather than calculated.
                </p>
              </details>
            </>
          )}
        </div>
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
                      onClick={() => {
                tick()
                setSelected({ year: view.year, month: view.month, day })
              }}
                    >
                      <span className="cal__holiday-day dev">{toDevanagari(day)}</span>
                      <span className="cal__holiday-name dev">
                        {names.map((name, i) => (
                          <span key={name}>
                            {i > 0 && ', '}
                            <FestivalName name={name} />
                          </span>
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}

      {/* Disclosure, not decoration.
          Lekh's whole pitch is that nothing leaves your browser, and this one
          screen does reach the network — a plain GET for a public file, no
          data about you attached, but a fetch nonetheless. It says which
          source the month on screen came from so that is never a secret. */}
      <details className="disclosure cal__source">
        {/* The status is the part that has to stay visible — it changes, and
            it is the only thing on this screen that says whether what you are
            looking at came off the network or out of the bundle. The reason
            it works that way does not change and is read once, so it goes
            behind the summary. */}
        <summary>
          <span className="disclosure__caret">
            <ChevronIcon dir="right" />
          </span>
          {source === 'live'
            ? 'Festivals updated from the live almanac'
            : source === 'bundled'
              ? 'Festivals from the built-in table — checking for updates when online'
              : 'Festivals unavailable for this month'}
        </summary>
        <p>
          Nepal publishes holidays in the Gazette, which has no machine-readable feed, so this is a
          community almanac rather than an official notice.{' '}
          <a href="https://github.com/S4NKALP/nepali-calendar-api" target="_blank" rel="noopener noreferrer">
            Almanac source
          </a>
          .
        </p>
      </details>

      {/* Was the last block of this page, five blocks below the grid. The
          month bar it now hangs off is pinned, so it is reachable from
          anywhere on the screen instead of only from the bottom of it. */}
      <ActionSheet
        open={converterOpen}
        onClose={onCloseConverter}
        label="Date converter"
        hideTitle
      >
        <DateConverter bare />
      </ActionSheet>
    </section>
  )
}
