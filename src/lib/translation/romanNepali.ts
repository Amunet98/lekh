import { DICT } from '../engine'
import { ENGLISH } from '../engine/dict/english'

/* Is this Latin-letter text really Nepali typed in English letters?
 *
 * Translate's default direction is English → Nepali, and someone who types
 * "malai dherai bhok lagyo" there gets it sent to the translator as English —
 * which hands back a respelling (मलाइ ढेरै भोक लग्यो), not a translation.
 * Romanized input is only read as Nepali in the other direction, so this is
 * what decides whether to offer the switch.
 *
 * The test is the typing dictionary: Lekh's own list of how people write
 * common Nepali words in English letters. Most of the words have to be in it,
 * at least two of them, and none of the text may be ordinary English glue —
 * "is", "the", "my" — because English sentences can contain a word that
 * happens to be a dictionary key ("ma", "ho", "pani"). Wrong either way is
 * cheap: the answer only decides whether a one-tap suggestion appears. */

/* The dictionary's English section is English words spelled the Nepali way
   (school → स्कुल); those are not evidence of Nepali. */
const NEPALI_KEYS = new Set(Object.keys(DICT).filter((k) => !(k in ENGLISH)))

/* Short, frequent English words. Any one of them and the text is treated as
   English. Kept to words that are not also common romanized Nepali. */
const ENGLISH_GLUE = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'am', 'i', 'you', 'he', 'she', 'it', 'we',
  'they', 'my', 'your', 'his', 'her', 'our', 'their', 'me', 'him', 'us', 'them', 'this', 'that',
  'these', 'those', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'and', 'or', 'but',
  'not', 'no', 'yes', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would', 'can', 'could',
  'should', 'what', 'where', 'when', 'why', 'how', 'who', 'which', 'there', 'here', 'please',
  'thank', 'thanks', 'hello', 'hi', 'good', 'very', 'so', 'if', 'then', 'all', 'some', 'any',
])

export function looksLikeRomanNepali(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z]+/g)
  if (!words || words.length < 2) return false
  // Devanagari mixed in is a different case; the translator reads that fine.
  if (/[ऀ-ॿ]/.test(text)) return false
  if (words.some((w) => ENGLISH_GLUE.has(w))) return false
  const nepali = words.filter((w) => NEPALI_KEYS.has(w)).length
  return nepali >= 2 && nepali * 2 >= words.length
}
