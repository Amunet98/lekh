import { convert } from './convert'

// Translation-only helper (see Translate/Scan pages): transliterates Latin
// runs in otherwise-mixed text ("mero naam" -> "मेरो नाम") by running each
// through the same convert() the typing engine uses. Whitespace,
// punctuation, digits, and any already-Devanagari text pass through
// untouched since the regex only matches Latin letter runs.
export function romanizedToDevanagari(text: string): string {
  return text.replace(/[a-zA-Z]+/g, (word) => convert(word))
}
