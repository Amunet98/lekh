import { DICT } from './engine/dict'

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
 * is far less likely, and for places the lookup earns its keep. */

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
      const known = DICT[m[2].toLowerCase()]
      return known !== undefined ? m[1] + known + m[3] : word
    })
    .join(' ')
}

/** The line with its blank filled, or the line as written when nothing has
 *  been typed yet. */
export function fillBlank(ne: string, value: string, kind: BlankKind = 'place'): string {
  const filled = blankToNepali(value, kind)
  return filled ? ne.replace(BLANK, filled) : ne
}
