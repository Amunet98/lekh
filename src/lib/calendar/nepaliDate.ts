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

/** Saturday. The weekly holiday in Nepal. */
export const SATURDAY = 6

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
