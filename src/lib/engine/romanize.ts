import { convert } from './convert'

// Translation-only helper (see Translate/Upload pages): transliterates Latin
// runs in otherwise-mixed text ("mero naam" -> "मेरो नाम") by running each
// through the same convert() the typing engine uses. Whitespace,
// punctuation, digits, and any already-Devanagari text pass through
// untouched since the regex only matches Latin letter runs.
export function romanizedToDevanagari(text: string): string {
  // The pattern's sign keys ride along inside a word (sa*saar, bas\, kri^ket);
  // `/` does not, since in prose it is usually just a slash.
  return text.replace(/[a-zA-Z][a-zA-Z~*\\^]*/g, (word) => convert(word))
}
