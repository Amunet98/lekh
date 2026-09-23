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

/* A whole phrase, word by word, which is the only way this engine converts —
   convert() takes one already-isolated word.

   Extracted because two callers have to agree exactly: appendSample() in
   useEditorState, which is what a starter chip inserts, and the chip's own
   label, which now shows what it is about to insert. A chip that advertises
   one thing and types another would be a worse bug than the unlabelled chip
   it replaced, and the only way to be sure is for both to run this. */
export function convertPhrase(words: string): string {
  return words.trim().split(/\s+/).map(convert).join(' ')
}
