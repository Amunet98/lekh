import { DIGITS } from './maps'
import { DICT } from './dict'
import { phonetic } from './phonetic'

/* ashesh's word-level rules, applied before the letter-by-letter pattern to
 * any word the dictionary does not know — they are part of what typing there
 * feels like, and leaving them out would make the same keystrokes spell
 * differently here.
 *
 * A few short words are respelled whole (cha → chha, lai → laaii), and four
 * are protected from the ending rules below. Then, for words of four or more
 * letters: a final cha/che/chu is the aspirate (garcha → गर्छ), a final y
 * reads as the long ee (see below), a final -a after a consonant run is lengthened
 * (except after the clusters listed), and a final -i after a consonant is the
 * long ी (nepaali → नेपाली). */
const WHOLE_WORD: Record<string, string> = {
  cha: 'chha',
  chu: 'chhu',
  nam: 'naam',
  ram: 'raam',
  lai: 'laaii',
  pai: 'paaii',
  dai: 'daaii',
  bhai: 'bhaaii',
}
const LEAVE_ALONE = new Set(['chha', 'ma', 'aba', 'pani'])
const isVowel = (c: string) => 'aeiou'.includes(c) && c !== ''

export function applyWordRules(word: string): string {
  if (Object.hasOwn(WHOLE_WORD, word)) return WHOLE_WORD[word]
  if (LEAVE_ALONE.has(word) || word.length <= 3) return word
  const lower = word.toLowerCase()
  const [e0, e1, e2, e3] = [1, 2, 3, 4].map((n) => lower.charAt(lower.length - n))
  let out = word
  if ('aeu'.includes(e0) && e1 === 'h' && e2 === 'c') {
    out = word.slice(0, -3) + 'chh' + word.slice(-1)
  } else if (e0 === 'y') {
    /* The one deliberate departure from ashesh, which writes 'ree' here: its
       own `rree` key (ॠ) then swallows the r before it, so "story" comes out
       स्तोॠ. 'ee' keeps the intent, a long ी: story → स्तोरी.
       A doubled r still made `rree` out of 'ee' — sorry → सोॠ, worry, hurry —
       so the pair is read as one r, the way it is said: sorry → सोरी. */
    const stem = e1 === 'r' && e2 === 'r' ? word.slice(0, -2) : word.slice(0, -1)
    out = stem + 'ee'
  } else if (
    e0 === 'a' &&
    !(e1 === 'h' && e2 === 'h') &&
    !(e1 === 'n' && (e2 === 'k' || e2 === 'h' || e2 === 'r')) &&
    !(e1 === 'r' && (e2 === 'd' || e2 === 't') && e3 === 'n') &&
    (e1 === 'm' || (!isVowel(e1) && !isVowel(e3) && e1 !== 'y' && e2 !== 'e'))
  ) {
    out = word + 'a'
  }
  if (e0 === 'i' && !isVowel(e1)) out = out.slice(0, -1) + 'ee'
  return out
}

/* The dictionary first (Lekh's own, owner-reviewed), then ashesh's word rules
 * and pattern. A token with no letters in it — a number, a date like
 * 2083/06/20 — only has its digits converted; everything else in it stays. */
export function convert(word: string): string {
  if (!/[A-Za-z]/.test(word)) {
    return word.replace(/\d/g, (d) => DIGITS[d])
  }
  const fromDict = DICT[word.toLowerCase()]
  return fromDict !== undefined ? fromDict : phonetic(applyWordRules(word))
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
