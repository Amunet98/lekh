/**
 * An independent check on the almanac's day alignment: the tithi each day
 * starts with is astronomy, so it can be computed here and compared with what
 * upstream says.
 *
 * WHAT IT CATCHES, AND WHAT IT DOES NOT
 *
 * It does not check that upstream's tithis are *right*. Nepali almanacs are
 * often computed with the traditional (Surya Siddhanta) method, which puts
 * tithi boundaries hours away from a modern ephemeris, so a few days a month
 * disagree in any honest almanac — measured 2026-10-27 over BS 2081–2083: at
 * most 5 days in a month, usually 0–2, always days when a tithi turns within a
 * few hours of sunrise. Turning that into a rule would reject good data.
 *
 * What it does check is alignment, which is the failure that cost real dates:
 * a month read off upstream's grid in the wrong order (see
 * src/lib/calendar/upstream.ts) has every festival a day or two late, and
 * looks perfectly normal. Against the computed tithis, such a month lines up
 * far better shifted by a day than as it stands. On that measurement every
 * correctly-read month of BS 2081–2083 matched best at zero shift, with 5 or
 * fewer misses, and every wrong alignment missed on 20 or more days — the nine
 * months the grid bug had shifted were exactly the nine this flagged.
 *
 * Build-time only (the generator and a test): astronomy-engine is a dev
 * dependency and never reaches the app's bundle.
 */
import { Body, MoonPhase, Observer, SearchRiseSet } from 'astronomy-engine'
import NepaliDateDefault from 'nepali-date-converter'

const NepaliDate = NepaliDateDefault.default ?? NepaliDateDefault

/* Sunrise is taken at Kathmandu, as Nepal's almanacs take it. */
const KATHMANDU = new Observer(27.7172, 85.324, 1340)
const NPT_OFFSET_MS = (5 * 60 + 45) * 60_000
const HOUR = 3_600_000
/* A day counts as agreeing when upstream's tithi is one that holds at some
   point from 2 h before sunrise to 4 h after. Both ends are under the
   shortest possible tithi (~19 h), so the window holds at most two. */
const BEFORE = 2 * HOUR
const AFTER = 4 * HOUR
/* More misses than this, even at the best alignment, fails the month. Twice
   the worst honest month measured, and a quarter of the 20 a wrong alignment
   scored at the least. */
export const MAX_MISSES = 10

/* The almanac names a tithi without its paksha, so 1–14 stand for both
   fortnights; 15 is पूर्णिमा and 30 is औंसी. Upstream's own spellings,
   including its द्दितीया, plus the usual ones. */
const NAMES = new Map([
  ['प्रतिपदा', 1], ['द्दितीया', 2], ['द्वितीया', 2], ['तृतीया', 3], ['चतुर्थी', 4],
  ['पञ्चमी', 5], ['पंचमी', 5], ['षष्ठी', 6], ['सप्तमी', 7], ['अष्टमी', 8], ['नवमी', 9],
  ['दशमी', 10], ['एकादशी', 11], ['द्वादशी', 12], ['त्रयोदशी', 13], ['चतुर्दशी', 14],
  ['पुर्णिमा', 15], ['पूर्णिमा', 15], ['औशी', 30], ['औंसी', 30], ['अमावस्या', 30],
])

/** 1–30 at that instant, folded to the almanac's naming (1–14, 15, 30). */
function tithiAt(time) {
  const n = Math.floor(MoonPhase(new Date(time)) / 12) + 1
  return n > 15 && n < 30 ? n - 15 : n
}

/** The tithis that hold around sunrise on an AD calendar date. */
function tithisAround(y, m, d) {
  const midnight = new Date(Date.UTC(y, m, d) - NPT_OFFSET_MS)
  const sunrise = SearchRiseSet(Body.Sun, KATHMANDU, +1, midnight, 1).date.getTime()
  return new Set([tithiAt(sunrise - BEFORE), tithiAt(sunrise + AFTER)])
}

/**
 * Checks one BS month's tithi list (`t`, index 0 = day 1; `month` 1-based).
 * Returns the misses at each shift from -2 to +2 days, the best shift, and
 * whether the month passes: best at zero, and no more than MAX_MISSES there.
 * A shift of -1 means each day carries the tithi of the day before it, i.e.
 * the month's festivals are a day late.
 */
export function checkMonthTithis(year, month, t) {
  // The library hands back a local-midnight Date; only its calendar date is used.
  const first = new NepaliDate(year, month - 1, 1).toJsDate()
  const around = []
  for (let i = -2; i < t.length + 2; i++) {
    const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i)
    around.push(tithisAround(day.getFullYear(), day.getMonth(), day.getDate()))
  }
  const misses = [-2, -1, 0, 1, 2].map(
    (shift) => t.filter((name, i) => !around[i + 2 + shift].has(NAMES.get(name.trim()))).length,
  )
  const best = misses.indexOf(Math.min(...misses)) - 2
  const atZero = misses[2]
  return { misses, best, ok: atZero === Math.min(...misses) && atZero <= MAX_MISSES }
}
