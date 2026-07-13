import { DIGITS } from './maps'
import { DICT } from './dict'
import { phonetic } from './phonetic'

// Not caret-aware — operates on a single already-isolated word, converted
// wholesale. Mid-text editing of already-converted text is out of scope
// for this pass (see project notes).
export function convert(word: string): string {
  if (/^\d+$/.test(word)) {
    return word.replace(/\d/g, (d) => DIGITS[d])
  }
  const fromDict = DICT[word.toLowerCase()]
  return fromDict !== undefined ? fromDict : phonetic(word)
}
