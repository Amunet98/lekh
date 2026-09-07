import { describe, expect, it } from 'vitest'
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  SATURDAY,
  SUNDAY,
  TWO_DAY_WEEKEND_FROM,
  adSpanLabel,
  adToBs,
  bsToAd,
  bsWeekday,
  compareBsDates,
  daysInBsMonth,
  isSameBsDate,
  isWeeklyOff,
  monthHasSundayOff,
  stepMonth,
  toDevanagari,
} from './nepaliDate'

/* The calendar is the part of this app that can be wrong without looking
 * wrong. A transliteration bug shows up as nonsense on screen; a date bug
 * shows up as a festival quietly landing a day early, and nobody finds out
 * until somebody misses it.
 *
 * nepaliDate.ts warns about that failure three separate times in its own
 * comments — every one of those warnings is about reading a local-midnight
 * Date back as UTC in a +05:45 zone. Nothing enforced any of it until now.
 *
 * These tests deliberately use only LOCAL date getters, never toISOString and
 * never a UTC accessor, because that is exactly the discipline the production
 * code is trying to keep. If a change made bsToAd hand back something whose
 * local calendar day is off by one, the sweep below fails everywhere at once.
 */

/** Every month in the supported range, as [year, month] pairs. */
function everyMonth(): [number, number][] {
  const months: [number, number][] = []
  for (let year = BS_MIN_YEAR; year <= BS_MAX_YEAR; year++) {
    for (let month = 0; month < 12; month++) months.push([year, month])
  }
  return months
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

describe('bsToAd / adToBs', () => {
  it('round-trips the first, middle and last day of every month in range', () => {
    const failures: string[] = []
    for (const [year, month] of everyMonth()) {
      const last = daysInBsMonth(year, month)
      for (const day of [1, 15, last]) {
        const back = adToBs(bsToAd(year, month, day))
        if (!isSameBsDate(back, { year, month, day })) {
          failures.push(
            `${year}-${month + 1}-${day} came back as ${back.year}-${back.month + 1}-${back.day}`,
          )
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('returns a Date sitting at local midnight, not UTC midnight', () => {
    // The whole one-day family of bugs starts here. A Date built at UTC
    // midnight reads as the *previous* day everywhere west of Greenwich and,
    // in Nepal at +05:45, is 05:45 on the right day rather than 00:00 — which
    // is why the production code formats with local getters throughout.
    const d = bsToAd(2082, 4, 22)
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0])
  })

  it('advances exactly one calendar day per BS day', () => {
    const first = bsToAd(2082, 4, 1)
    const second = bsToAd(2082, 4, 2)
    expect(Math.round((second.getTime() - first.getTime()) / ONE_DAY_MS)).toBe(1)
  })
})

describe('daysInBsMonth', () => {
  it('is always 29-32 across the whole range', () => {
    const odd = everyMonth()
      .map(([y, m]) => [y, m, daysInBsMonth(y, m)] as const)
      .filter(([, , len]) => len < 29 || len > 32)
    expect(odd).toEqual([])
  })

  it('agrees with the gap between consecutive month starts', () => {
    // The function probes the library by asking for day 32 and walking down.
    // This checks that answer against a completely different question: how
    // many days actually elapse before the next month begins.
    const failures: string[] = []
    for (const [year, month] of everyMonth()) {
      const next = stepMonth(year, month, 1)
      if (next.year === year && next.month === month) continue // clamped at the end
      const elapsed = Math.round(
        (bsToAd(next.year, next.month, 1).getTime() - bsToAd(year, month, 1).getTime()) / ONE_DAY_MS,
      )
      if (elapsed !== daysInBsMonth(year, month)) {
        failures.push(`${year}-${month + 1}: table says ${daysInBsMonth(year, month)}, dates say ${elapsed}`)
      }
    }
    expect(failures).toEqual([])
  })
})

describe('bsWeekday', () => {
  it('matches the weekday of the converted Gregorian date', () => {
    const failures: string[] = []
    for (const [year, month] of everyMonth()) {
      for (const day of [1, 15]) {
        const viaBs = bsWeekday(year, month, day)
        const viaAd = bsToAd(year, month, day).getDay()
        if (viaBs !== viaAd) failures.push(`${year}-${month + 1}-${day}: ${viaBs} vs ${viaAd}`)
      }
    }
    expect(failures).toEqual([])
  })
})

describe('the two-day weekend', () => {
  /* The one hard-coded claim in this file, and the one most likely to be
     quietly invalidated by a library bump: nepaliDate.ts states that Chaitra
     23, 2082 "converts to 6 April 2026 and matches the date the Nepali press
     reported". If that stops being true, the rule starts on the wrong day. */
  it('starts on the date the source comment claims — 6 April 2026', () => {
    const d = bsToAd(TWO_DAY_WEEKEND_FROM.year, TWO_DAY_WEEKEND_FROM.month, TWO_DAY_WEEKEND_FROM.day)
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate()]).toEqual([2026, 4, 6])
  })

  it('treats Saturday as a day off regardless of date', () => {
    expect(isWeeklyOff({ year: 2081, month: 0, day: 1 }, SATURDAY)).toBe(true)
    expect(isWeeklyOff({ year: 2090, month: 11, day: 30 }, SATURDAY)).toBe(true)
  })

  it('treats Sunday as a day off only from the start date onward', () => {
    const before = { year: 2082, month: 11, day: 22 }
    const onIt = TWO_DAY_WEEKEND_FROM
    const after = { year: 2083, month: 0, day: 1 }
    expect(isWeeklyOff(before, SUNDAY)).toBe(false)
    expect(isWeeklyOff(onIt, SUNDAY)).toBe(true)
    expect(isWeeklyOff(after, SUNDAY)).toBe(true)
  })

  it('leaves midweek days alone', () => {
    for (const weekday of [1, 2, 3, 4, 5]) {
      expect(isWeeklyOff({ year: 2083, month: 0, day: 1 }, weekday)).toBe(false)
    }
  })

  it('flags the month the change lands in, and every month after', () => {
    expect(monthHasSundayOff(2082, 10)).toBe(false) // Falgun 2082, entirely before
    expect(monthHasSundayOff(2082, 11)).toBe(true) // Chaitra 2082, contains it
    expect(monthHasSundayOff(2083, 0)).toBe(true)
  })
})

describe('compareBsDates', () => {
  it('orders by year, then month, then day', () => {
    expect(compareBsDates({ year: 2081, month: 5, day: 1 }, { year: 2082, month: 0, day: 1 })).toBe(-1)
    expect(compareBsDates({ year: 2082, month: 5, day: 1 }, { year: 2082, month: 4, day: 30 })).toBe(1)
    expect(compareBsDates({ year: 2082, month: 5, day: 2 }, { year: 2082, month: 5, day: 3 })).toBe(-1)
    expect(compareBsDates({ year: 2082, month: 5, day: 3 }, { year: 2082, month: 5, day: 3 })).toBe(0)
  })
})

describe('stepMonth', () => {
  it('walks forward and back within a year', () => {
    expect(stepMonth(2082, 5, 1)).toEqual({ year: 2082, month: 6 })
    expect(stepMonth(2082, 5, -1)).toEqual({ year: 2082, month: 4 })
  })

  it('rolls over the year boundary in both directions', () => {
    expect(stepMonth(2082, 11, 1)).toEqual({ year: 2083, month: 0 })
    expect(stepMonth(2082, 0, -1)).toEqual({ year: 2081, month: 11 })
  })

  it('clamps at the edges of the conversion table rather than throwing', () => {
    // Stepping outside the table makes the library throw, and a calendar that
    // crashes when you page too far is worse than one that stops.
    expect(stepMonth(BS_MIN_YEAR, 0, -1)).toEqual({ year: BS_MIN_YEAR, month: 0 })
    expect(stepMonth(BS_MAX_YEAR, 11, 1)).toEqual({ year: BS_MAX_YEAR, month: 11 })
  })
})

describe('adSpanLabel', () => {
  it('names both Gregorian months a BS month straddles', () => {
    // Every BS month starts mid-Gregorian-month, so essentially all of them
    // span two. The format is "Mon/Mon YYYY", or with both years when the BS
    // month crosses New Year.
    expect(adSpanLabel(2082, 4)).toMatch(/^[A-Z][a-z]{2}\/[A-Z][a-z]{2} \d{4}$/)
  })

  it('shows both years when the month crosses 1 January', () => {
    // Poush (month 8) reliably straddles the Gregorian year boundary.
    expect(adSpanLabel(2082, 8)).toMatch(/\d{4}\/\d{4}$/)
  })

  it('never throws anywhere in range', () => {
    expect(() => everyMonth().forEach(([y, m]) => adSpanLabel(y, m))).not.toThrow()
  })
})

describe('toDevanagari', () => {
  it('maps every Latin digit', () => {
    expect(toDevanagari('0123456789')).toBe('०१२३४५६७८९')
  })

  it('converts numbers as well as strings', () => {
    expect(toDevanagari(2083)).toBe('२०८३')
  })

  it('passes non-digits through untouched', () => {
    expect(toDevanagari('BS 2083, भदौ')).toBe('BS २०८३, भदौ')
  })
})
