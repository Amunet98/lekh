import raw from '../../data/calendar/panchang.json'
import { daysInBsMonth } from './nepaliDate'

/* Festivals, public holidays and tithi.
 *
 * WHY THIS IS DATA AND NOT A CALCULATION
 *
 * The calendar grid works for any year in the conversion table (BS 2000–2090)
 * because BS dates come from a month-length table. Festivals do not work that
 * way. Dashain, Tihar, Teej, Shivaratri, Janai Purnima and most of the rest
 * fall on a *tithi* — a lunar day — which needs real lunar ephemeris plus the
 * panchang convention about which sunrise a tithi is counted against.
 * Computing that in the browser would be a large bundle and a good chance of
 * being quietly one day out, which is worse than not showing it at all.
 *
 * TWO SOURCES, ONE SHAPE
 *
 * The bundled table (scripts/fetch-calendar-data.mjs) is the offline baseline
 * and always works. On top of it, `fetchLiveMonth` pulls the same month from
 * upstream, which re-scrapes daily — so a holiday added or dropped by cabinet
 * decision reaches the app within about a day, and years past the bundled
 * range appear without a redeploy.
 *
 * THE CROSS-CHECK IS THE LOAD-BEARING PART, AND IT RUNS AT RUNTIME TOO
 *
 * The grid is drawn from the conversion table; the festivals come from the
 * almanac. If the two disagree about how long a month is, every festival after
 * the discrepancy lands on the wrong square — silently, and looking entirely
 * normal. The build-time generator drops such years (BS 2084 is dropped for
 * exactly this reason). `assertMonthLength` applies the identical rule to live
 * data, because data fetched at runtime has had no chance to be reviewed.
 *
 * Source: https://github.com/S4NKALP/nepali-calendar-api (MIT, © 2026 Sankalp
 * Tharu), which scrapes nepalicalendar.rat32.com. That is a third-party
 * almanac, not an official Government of Nepal notice — public holidays are
 * set by cabinet decision and do move. Nepal publishes them in the Gazette,
 * which is not machine-readable, so there is no official feed to use instead.
 */

/** The compact per-month shape both sources produce. */
export interface RawMonth {
  /** BS day (string key) → comma-separated festival names in Devanagari. */
  f: Record<string, string>
  /** BS days flagged as declared/festival holidays by the source. */
  h: number[]
  /** Tithi name per BS day, index 0 = day 1. */
  t: string[]
}

interface PanchangFile {
  coverage: { from: number; to: number }
  source: string
  generated: string
  years: Record<string, Record<string, RawMonth>>
}

const data = raw as PanchangFile

export const COVERAGE = data.coverage

const UPSTREAM = 'https://raw.githubusercontent.com/S4NKALP/nepali-calendar-api/main/data'

export interface DayPanchang {
  festivals: string[]
  isHoliday: boolean
  tithi: string
}

export interface MonthPanchang {
  byDay: Map<number, DayPanchang>
  holidays: { day: number; names: string[] }[]
}

/**
 * The safety property, shared by the generator and the live fetcher: a month
 * whose day count disagrees with the conversion table is rejected outright.
 * Returning null loses that month's festivals; accepting it would put them on
 * the wrong days, which is the failure nobody can see.
 */
function assertMonthLength(year: number, month: number, m: RawMonth): RawMonth | null {
  return m.t.length === daysInBsMonth(year, month) ? m : null
}

export function getBundledMonth(year: number, month: number): RawMonth | null {
  const m = data.years[String(year)]?.[String(month + 1)]
  return m ? assertMonthLength(year, month, m) : null
}

/**
 * Splits on ',' except while inside '(...)'. An unclosed paren (a couple of
 * entries in the bundled data run off the end of the string without ever
 * closing one) just means depth never returns to zero, so the rest of the
 * text stays one fragment instead of being cut at the next comma — still
 * better than splitting mid-note.
 */
function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let current = ''
  let depth = 0
  for (const ch of text) {
    if (ch === '(') {
      depth++
      current += ch
    } else if (ch === ')') {
      depth--
      current += ch
    } else if (ch === ',' && depth <= 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts
}

/** Turns either source's raw month into what the UI renders. */
export function buildMonth(m: RawMonth): MonthPanchang {
  const holidaySet = new Set(m.h)
  const byDay = new Map<number, DayPanchang>()

  for (let day = 1; day <= m.t.length; day++) {
    const text = m.f[String(day)] ?? ''
    byDay.set(day, {
      /* The source packs several festivals into one comma-separated string.
         Split for rendering but keep the original order — it is roughly
         significance order, so the first name is the one worth showing when
         there is only room for one. A few entries have a comma *inside* a
         parenthetical note (e.g. "...होली(हिमाली, पहाडी तथा भित्री मधेशका ५६
         जिल्लाहरूमा बिदा)"), so a plain split on ',' would cut that note in
         half — split only at top level. */
      festivals: text ? splitTopLevel(text).map((s) => s.trim()).filter(Boolean) : [],
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

/**
 * One month from upstream. Resolves to null on any failure — offline, a 404
 * for a year not yet published, malformed JSON, or a month-length
 * disagreement. Every one of those is a normal state, not an error worth
 * surfacing: the bundled table is still there.
 *
 * No caching or retry here on purpose. The service worker gives this URL a
 * StaleWhileRevalidate route (see vite.config.ts), so repeat views are served
 * from cache instantly and refreshed in the background, and a month fetched
 * once keeps working with the network off.
 */
export async function fetchLiveMonth(year: number, month: number): Promise<RawMonth | null> {
  try {
    const res = await fetch(`${UPSTREAM}/${year}/${month + 1}.json`)
    if (!res.ok) return null
    const json = (await res.json()) as { days?: { n?: string; f?: string; t?: string; h?: boolean }[] }
    if (!Array.isArray(json.days)) return null

    /* `days` is a 35- or 42-cell grid including the blank leading cells before
       the 1st, so the real days are the ones carrying a Devanagari numeral. */
    const days = json.days.filter((c) => c.n && String(c.n).trim() !== '')
    if (days.length === 0) return null

    const f: Record<string, string> = {}
    const h: number[] = []
    const t: string[] = []
    days.forEach((cell, i) => {
      const day = i + 1
      const festival = (cell.f || '').trim()
      if (festival) f[String(day)] = festival
      if (cell.h === true) h.push(day)
      t.push((cell.t || '').trim())
    })

    /* A month with no festival names at all means the source has published
       the day grid but not the almanac content yet — which is exactly the
       state BS 2084 is in: 31 days, 4 unnamed holiday flags, and no festivals,
       despite Baisakh 1 being नयाँ वर्ष. Accepting it would render as
       "this month has no festivals", which is a confident lie.
     *
     * Zero is a safe threshold rather than a guess: across the 36 bundled
     * months the count runs 11–25 with a median of 15, and never once 0. */
    if (Object.keys(f).length === 0) return null

    return assertMonthLength(year, month, { f, h, t })
  } catch {
    // Offline, blocked, or CORS — the bundled table covers it.
    return null
  }
}
