import { DICT } from './engine/dict'
import { convert } from './engine/convert'
import { isWikiWord, wikiMatches } from './engine/wiki'

/* Filling the blank in a phrasebook line ("My name is …", "Where is …?").
 *
 * What a traveller types goes into the Nepali, but only in a spelling Lekh is
 * sure of. A word Lekh's own dictionary knows becomes Devanagari (Thamel →
 * ठमेल, airport → एयरपोर्ट); anything else stays exactly as typed. The
 * phonetic engine that drives the Type tab is built for Nepali typed in
 * Roman letters, and run on a foreign name it guesses: John → जोह्न, Sarah →
 * सरह, Nagarkot → णगर्कोत (a capital N is ण in that scheme). The person
 * typing cannot tell a good guess from a bad one, and "मेरो नाम John हो।" is
 * ordinary written Nepali, where a misspelt name is not. Devanagari typed
 * directly passes through untouched.
 *
 * And a NAME is never looked up at all, only a place. The dictionary is
 * romanized Nepali, so a name can collide with an ordinary word: "Jane" came
 * out as जाने, "to go" (caught by the tests). A place name colliding that way
 * is far less likely, and for places the lookup earns its keep.
 *
 * A place Lekh's dictionary does not know gets one more chance (2.0.8): the
 * Nepali Wikipedia word list, matched by sound the way the Type tab's
 * suggestions are (see engine/wiki.ts). Only when the answer is unambiguous:
 * exactly one word sounds like it, and Lekh's own spelling of it is not
 * already a different real word. Measured on 48 places and names
 * (2026-11-18), that rule turned Nagarkot → नगरकोट, Swayambhunath →
 * स्वयम्भूनाथ, Lukla → लुक्ला, Jomsom → जोमसोम, Ratnapark → रत्नपार्क and
 * got none wrong; the looser "first match" would have made Patan पतन
 * ("downfall"), Asan आसन ("seat") and Dharan धारण. Those stay as typed. The
 * list loads lazily, so until it has, a place falls back to as-typed too. */

export const BLANK = '…'

const DEVANAGARI = /[ऀ-ॿ]/

export type BlankKind = 'name' | 'place'

export function blankToNepali(value: string, kind: BlankKind = 'place'): string {
  if (kind === 'name') return value.trim().split(/\s+/).filter(Boolean).join(' ')
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (DEVANAGARI.test(word)) return word
      // Keep surrounding punctuation where it was; look the letters up.
      const m = /^([^A-Za-z]*)([A-Za-z][A-Za-z'-]*)([^A-Za-z]*)$/.exec(word)
      if (!m) return word
      const lower = m[2].toLowerCase()
      const known = DICT[lower] ?? fromWiki(lower)
      return known !== undefined ? m[1] + known + m[3] : word
    })
    .join(' ')
}

/* Lowercase in: a capital N, T, D or Sh is a different letter in Lekh's
   typing scheme (Nagarkot → णगर्कोत), and a place name is capitalised by
   habit, not to ask for a retroflex. */
function fromWiki(lower: string): string | undefined {
  const dev = convert(lower)
  if (isWikiWord(dev)) return undefined
  const { same } = wikiMatches(dev, { same: 2, longer: 0 })
  return same.length === 1 ? same[0] : undefined
}

/** The line with its blank filled, or the line as written when nothing has
 *  been typed yet. */
export function fillBlank(ne: string, value: string, kind: BlankKind = 'place'): string {
  const filled = blankToNepali(value, kind)
  return filled ? ne.replace(BLANK, filled) : ne
}
