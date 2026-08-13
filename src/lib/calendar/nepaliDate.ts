import NepaliDate from 'nepali-date-converter'

/* Bikram Sambat dates, and the vocabulary for writing them in Nepali.
 *
 * Conversion comes from `nepali-date-converter` (MIT, no dependencies), which
 * ships a month-length table for BS 2000–2090. That table is the only honest
 * way to do this: BS months run 29–32 days on a pattern that is derived from
 * solar transits, not from a formula, so there is nothing to compute. The
 * table really is tabulated data — 16 distinct year patterns across its 91
 * years, not one repeating cycle.
 *
 * Everything here is date arithmetic. Festivals live in ./panchang, and are
 * a separate problem with a much shorter range — see the comment there.
 */

/** Devanagari month names, in BS order. Index 0 = Baisakh. */
export const NP_MONTHS = [
  'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भदौ', 'असोज',
  'कार्तिक', 'मंसिर', 'पुष', 'माघ', 'फागुन', 'चैत',
] as const

/** Latin transliterations, for the AD-side label and for screen readers. */
export const NP_MONTHS_EN = [
  'Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Aswin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
] as const

/* The Nepali week starts on Sunday, and Saturday — not Sunday — is the weekly
   day off. That is why शनि is styled like a holiday in the grid and आइत is
   not; getting it the Western way round would be wrong on every single row. */
export const NP_WEEKDAYS_SHORT = ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिहि', 'शुक्र', 'शनि'] as const
export const NP_WEEKDAYS_FULL = [
  'आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहिबार', 'शुक्रबार', 'शनिबार',
] as const
export const EN_WEEKDAYS_FULL = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

export const SUNDAY = 0
export const SATURDAY = 6

/* Nepal moved to a two-day weekend.
 *
 * Saturday has always been the weekly day off. On 5 April 2026 the cabinet
 * declared Sunday one as well, effective the next day — Chaitra 23, 2082,
 * which converts to 6 April 2026 and matches the date the Nepali press
 * reported. It applies to government offices and educational institutions;
 * several local levels rejected it as impractical, and the private sector is
 * not covered, so this is "a public holiday" rather than "everyone is off".
 *
 * It is dated rather than global, and that matters: marking Sundays across BS
 * 2081 would be retroactively wrong for every week before the change. The
 * source data cannot help here — its own holiday flag is inconsistent about
 * weekends (29 of 53 Saturdays in BS 2081, 48 of 52 in BS 2082) and does not
 * encode the Sunday policy at all, so the weekly pattern is a rule we apply
 * and the source's flag is left to mean "a declared or festival holiday".
 *
 * If the policy is reversed — it was reported as under threat in July 2026 and
 * the government denied it — add an end date here rather than deleting this. */
export const TWO_DAY_WEEKEND_FROM: BsDate = { year: 2082, month: 11, day: 23 }

/** −1, 0 or 1, comparing two BS dates chronologically. */
export function compareBsDates(a: BsDate, b: BsDate): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1
  if (a.month !== b.month) return a.month < b.month ? -1 : 1
  if (a.day !== b.day) return a.day < b.day ? -1 : 1
  return 0
}

/** Is this date a weekly day off (as opposed to a festival/declared holiday)? */
export function isWeeklyOff(date: BsDate, weekday: number): boolean {
  if (weekday === SATURDAY) return true
  if (weekday === SUNDAY) return compareBsDates(date, TWO_DAY_WEEKEND_FROM) >= 0
  return false
}

/** Does the two-day weekend apply anywhere within this BS month? */
export function monthHasSundayOff(year: number, month: number): boolean {
  const lastDay = { year, month, day: daysInBsMonth(year, month) }
  return compareBsDates(lastDay, TWO_DAY_WEEKEND_FROM) >= 0
}

const DEVANAGARI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']

/** 2083 → २०८३. Digits only; any other character passes through untouched. */
export function toDevanagari(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)])
}

export interface BsDate {
  year: number
  /** 0–11, Baisakh = 0 — matches JS Date's month convention. */
  month: number
  day: number
}

/* The span the conversion table covers. The UI clamps navigation to this;
   stepping outside it makes the library throw, and a calendar that crashes
   when you page too far is worse than one that stops. */
export const BS_MIN_YEAR = 2000
export const BS_MAX_YEAR = 2090

export function daysInBsMonth(year: number, month: number): number {
  /* Walk down from 32 rather than reading the library's private table: ask for
     a date and see whether it comes back as the date you asked for. An
     over-long day rolls into the next month, which is the signal. */
  for (let d = 32; d >= 29; d--) {
    try {
      const probe = new NepaliDate(year, month, d)
      if (probe.getMonth() === month && probe.getDate() === d) return d
    } catch {
      // Out of the table's range — keep stepping down.
    }
  }
  return 30
}

export function bsToAd(year: number, month: number, day: number): Date {
  return new NepaliDate(year, month, day).toJsDate()
}

export function adToBs(date: Date): BsDate {
  const nd = new NepaliDate(date)
  return { year: nd.getYear(), month: nd.getMonth(), day: nd.getDate() }
}

export function todayBs(): BsDate {
  return adToBs(new Date())
}

/** Weekday index (0 = Sunday) of a BS date. */
export function bsWeekday(year: number, month: number, day: number): number {
  return new NepaliDate(year, month, day).getDay()
}

/** Step a BS year/month pair by ±1 month, clamped to the table's range. */
export function stepMonth(year: number, month: number, delta: number): { year: number; month: number } {
  let y = year
  let m = month + delta
  if (m < 0) {
    m = 11
    y -= 1
  } else if (m > 11) {
    m = 0
    y += 1
  }
  if (y < BS_MIN_YEAR) return { year: BS_MIN_YEAR, month: 0 }
  if (y > BS_MAX_YEAR) return { year: BS_MAX_YEAR, month: 11 }
  return { year: y, month: m }
}

/** "Sep/Oct 2026" — the Gregorian span a BS month straddles. */
export function adSpanLabel(year: number, month: number): string {
  const first = bsToAd(year, month, 1)
  const last = bsToAd(year, month, daysInBsMonth(year, month))
  const fmt = (d: Date) => d.toLocaleString('en-US', { month: 'short' })
  const a = fmt(first)
  const b = fmt(last)
  const years = first.getFullYear() === last.getFullYear()
    ? `${first.getFullYear()}`
    : `${first.getFullYear()}/${last.getFullYear()}`
  return a === b ? `${a} ${years}` : `${a}/${b} ${years}`
}

export function isSameBsDate(a: BsDate, b: BsDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day
}
