import raw from '../../data/calendar/panchang.json'

/* Festivals, public holidays and tithi.
 *
 * WHY THIS IS DATA AND NOT A CALCULATION, AND WHY IT RUNS OUT
 *
 * The calendar grid works for any year in the conversion table (BS 2000–2090)
 * because BS dates come from a month-length table. Festivals do not work that
 * way. Dashain, Tihar, Teej, Shivaratri, Janai Purnima and most of the rest
 * fall on a *tithi* — a lunar day — which needs real lunar ephemeris plus the
 * panchang convention about which sunrise a tithi is counted against.
 * Computing that in the browser would be a large bundle and a good chance of
 * being quietly one day out, which is worse than not showing it at all.
 *
 * So it is tabulated, by scripts/fetch-calendar-data.mjs, and the table has a
 * hard end. `COVERAGE` is that end, and the UI is required to say so — an
 * uncovered month must announce itself, never render as a month that simply
 * has no festivals in it.
 *
 * The generator cross-checks every month length against the conversion table
 * and drops any year where the two disagree, because a year that is one day
 * out from Jestha onward would put Dashain on the wrong square while looking
 * perfectly normal. BS 2084 is currently dropped for exactly that reason.
 *
 * Source: https://github.com/S4NKALP/nepali-calendar-api (MIT, © 2026 Sankalp
 * Tharu), which scrapes nepalicalendar.rat32.com. That is a third-party
 * almanac, not an official Government of Nepal notice — public holidays are
 * set by cabinet decision and do move. Good, but not gospel.
 */

interface MonthPanchang {
  /** BS day (as a string key) → comma-separated festival names in Devanagari. */
  f: Record<string, string>
  /** BS days that are public holidays. */
  h: number[]
  /** Tithi name per BS day, index 0 = day 1. */
  t: string[]
}

interface PanchangFile {
  coverage: { from: number; to: number }
  source: string
  generated: string
  years: Record<string, Record<string, MonthPanchang>>
}

const data = raw as PanchangFile

export const COVERAGE = data.coverage
export const SOURCE = data.source

export interface DayPanchang {
  festivals: string[]
  isHoliday: boolean
  tithi: string
}

export function hasPanchang(year: number): boolean {
  return year >= COVERAGE.from && year <= COVERAGE.to
}

/**
 * Everything known about one BS month, or null when the year is outside the
 * tabulated range. Callers must handle null by saying so — see the note above.
 *
 * `month` is 0-indexed to match nepaliDate.ts and JS Date; the data file is
 * keyed 1–12, which is what the +1 is doing.
 */
export function getMonthPanchang(
  year: number,
  month: number,
): { byDay: Map<number, DayPanchang>; holidays: { day: number; names: string[] }[] } | null {
  const y = data.years[String(year)]
  if (!y) return null
  const m = y[String(month + 1)]
  if (!m) return null

  const holidaySet = new Set(m.h)
  const byDay = new Map<number, DayPanchang>()
  const dayCount = m.t.length

  for (let day = 1; day <= dayCount; day++) {
    const festivalText = m.f[String(day)] ?? ''
    byDay.set(day, {
      /* The source packs several festivals into one comma-separated string.
         Split for rendering, but keep the original order — it is roughly
         significance order, so the first name is the one worth showing when
         there is only room for one. */
      festivals: festivalText ? festivalText.split(',').map((s) => s.trim()).filter(Boolean) : [],
      isHoliday: holidaySet.has(day),
      tithi: m.t[day - 1] ?? '',
    })
  }

  const holidays = m.h
    .slice()
    .sort((a, b) => a - b)
    .map((day) => ({ day, names: byDay.get(day)?.festivals ?? [] }))

  return { byDay, holidays }
}
