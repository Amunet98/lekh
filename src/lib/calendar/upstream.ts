/* What both readers of the upstream almanac share — the build-time generator
 * (scripts/fetch-calendar-data.mjs) and the live fetch (fetchLiveMonth in
 * panchang.ts). Kept free of imports so plain node can load it.
 *
 * WHICH CELL IS WHICH DAY
 *
 * Upstream gives each month as a 35-cell, five-row grid, like a wall
 * calendar. A month that needs a sixth row wraps its last day or two into the
 * empty cells at the top left, so the grid can begin ३०, ३१, १, २ … २९. Those
 * leading cells are the month's own last days, not the previous month's —
 * their AD date (`e`) says so: the ३१ in Jestha 2083's top-left cell is
 * 14 June, and Jestha 1 is 15 May.
 *
 * Reading cells in grid order put every festival in such a month one or two
 * days late, and day 1 got the last day's festivals. The day count still
 * came out right, so the month-length check passed. Nine months of BS
 * 2081–2083 were affected, among them Kartik 2082 (Bhai Tika showed on
 * Kartik 7 instead of 6) and Falgun 2083. Found 2026-10-27.
 *
 * So the day is read off the cell's own numeral, and the result is only
 * trusted when those numerals are exactly 1…N with nothing missing or
 * repeated. */

export interface UpstreamCell {
  /** The BS day as a Devanagari numeral; '' for a blank cell. */
  n?: string
  /** Comma-separated festival names. */
  f?: string
  t?: string
  h?: boolean
}

const DIGITS = '०१२३४५६७८९'

function dayNumber(n: string): number {
  const s = n.trim()
  if (!/^[०-९]+$/.test(s)) return NaN
  return Number([...s].map((d) => DIGITS.indexOf(d)).join(''))
}

/** The month's cells in day order, or null unless they are exactly days 1…N. */
export function monthCells<T extends UpstreamCell>(grid: readonly T[]): T[] | null {
  const numbered = grid
    .filter((c) => c.n && c.n.trim() !== '')
    .map((cell) => ({ cell, day: dayNumber(String(cell.n)) }))
    .sort((a, b) => a.day - b.day)
  if (numbered.length === 0) return null
  if (numbered.some((x, i) => x.day !== i + 1)) return null
  return numbered.map((x) => x.cell)
}

/* CORRECTIONS
 *
 * Upstream is a scrape of a third-party almanac, and now and then it is
 * simply wrong about a festival. A correction replaces one day's festival
 * text, and only while upstream still says exactly what it said when the
 * correction was written (`was`). If upstream changes that day, fixed or
 * otherwise, the correction stops applying rather than editing text nobody
 * has read. The generator lists any that no longer match.
 *
 * Every entry needs a source. A secondary source is fine when it reports the
 * Nepal Panchanga Nirnayak Samiti's decision; a guess is not. */

export interface Correction {
  year: number
  /** 1-based, as upstream numbers its files. */
  month: number
  day: number
  /** Upstream's text for the day, exactly. Whitespace runs are collapsed. */
  was: string
  now: string
  source: string
}

export const CORRECTIONS: readonly Correction[] = [
  /* Tihar 2083. Chaturdashi and Amavasya share Kartik 22, and Laxmi Puja
     follows the Amavasya that holds at dusk, so the Samiti put it on Kartik 22
     with Kukur Tihar. Kartik 23, Amavasya at sunrise, is Gai Puja only.
     Upstream has no Laxmi Puja anywhere in the month. It goes first: the
     first name is the one a one-line widget has room for. */
  {
    year: 2083, month: 7, day: 22,
    was: 'कुकुर तिहार, नरक चतुर्दशी',
    now: 'लक्ष्मी पूजा, कुकुर तिहार, नरक चतुर्दशी',
    source: 'Hamro Patro, the Samiti’s 2083 festival decisions: "कात्तिक: २२ गते कुकुर तिहार / लक्ष्मीपूजा" (https://www.hamropatro.com/pages/hamropatro-blog/-Okw035Eh6jeni8Fp6HT), checked 2026-10-27; vedicmarga.com agrees on 8 Nov',
  },
  {
    year: 2083, month: 7, day: 24,
    was: 'स्वःन्ति पारू, गोरू पूजा',
    now: 'स्वःन्ति पारू, गोरू पूजा, गोवर्द्धन पूजा',
    source: 'Same Hamro Patro post: "कात्तिक: २४ गोबर्द्धन, म्ह पूजा", checked 2026-10-27',
  },
]

const collapse = (s: string) => s.replace(/\s+/g, ' ').trim()

/** The day's festival text with any matching correction applied. */
export function correctedFestivals(year: number, month: number, day: number, text: string): string {
  const fix = CORRECTIONS.find((c) => c.year === year && c.month === month && c.day === day)
  return fix && collapse(fix.was) === collapse(text) ? fix.now : text
}
