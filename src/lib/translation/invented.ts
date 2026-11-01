/* Scripture the offline model made up (1.9.108).
 *
 * NLLB-200, the on-device model, learnt much of its Nepali from Bible
 * translations, among the few large English–Nepali parallel texts there are.
 * Given something short and proverb-like it can fall back on them: the owner
 * typed "dhan bhanda thulo man ho" (a big heart matters more than wealth) and
 * got 'The Bible says: "The heart is greater than the riches". - 1 John 2:15.'
 * with an invented citation. The online services do not do this.
 *
 * This lists what in an answer looks like that and was not in the text being
 * translated: a chapter:verse reference, or a scripture word. The provider
 * retries once with those words banned, and the page warns if it still sees
 * them. Kept to unmistakable markers: "God" or "Lord" are ordinary words in
 * plenty of real sentences, and a false alarm would only make people distrust
 * a good translation. */

const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Deuteronomy', 'Joshua', 'Judges', 'Samuel', 'Kings',
  'Chronicles', 'Nehemiah', 'Esther', 'Psalm', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Isaiah',
  'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Matthew', 'Mark', 'Luke', 'John',
  'Acts', 'Romans', 'Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  'Thessalonians', 'Timothy', 'Titus', 'Hebrews', 'James', 'Peter', 'Jude', 'Revelation',
]
/* Each group is one word in both scripts: "Bible" in the text accounts for
   बाइबल in the answer, and the other way round. */
const GROUPS: string[][] = [
  ['Bible', 'बाइबल', 'बाइबलले', 'बाइबलमा'],
  ['Jehovah', 'यहोवा', 'यहोवाको', 'यहोवाले'],
  ['Scripture', 'Scriptures', 'धर्मशास्त्र', 'धर्मशास्त्रमा'],
  ['Gospel', 'सुसमाचार'],
  ['Psalm', 'Psalms', 'भजनसंग्रह'],
  ['Proverbs', 'हितोपदेश'],
  ['John', 'यूहन्ना'],
  ['Matthew', 'मत्ती'],
  ['Luke', 'लूका'],
  ['Mark', 'मर्कूस'],
]
const NE_BOOKS: Record<string, string> = { यूहन्ना: 'John', मत्ती: 'Matthew', लूका: 'Luke', मर्कूस: 'Mark' }
/* Book names are only scripture as part of a reference ("John 3:16"); alone
   they are names, so they are matched through BOOK_REF, not as words. */
const NAME_ONLY = new Set(['John', 'Matthew', 'Luke', 'Mark', 'यूहन्ना', 'मत्ती', 'लूका', 'मर्कूस'])

/* "2:15", "१ यूहन्ना २:१५", "3:16-18": a chapter:verse pair in either digits. */
const VERSE = /[\d०-९]{1,3}\s?:\s?[\d०-९]{1,3}/
/* A book name right before one, so a lone "John" (a name) never counts. */
const BOOK_REF = new RegExp(`\\b(${BOOKS.join('|')})\\s+[\\d०-९]{1,3}\\s?:`, 'i')

const NE_BOOK_REF = new RegExp(`(${Object.keys(NE_BOOKS).join('|')})\\s*[\\d०-९]{1,3}\\s?:`)

const has = (text: string, word: string) =>
  /[a-z]/i.test(word) ? new RegExp(`\\b${word}\\b`, 'i').test(text) : text.includes(word)

/** The invented markers in `output` that `source` does not account for:
 *  scripture words, a cited book name, and ':' for a verse reference. Empty
 *  when the answer looks clean. */
export function inventedMarkers(source: string, output: string): string[] {
  const found: string[] = []
  for (const group of GROUPS) {
    if (group.some((w) => has(source, w))) continue
    for (const w of group) if (!NAME_ONLY.has(w) && has(output, w)) found.push(w)
  }
  const book = output.match(BOOK_REF) ?? output.match(NE_BOOK_REF)
  if (book && !GROUPS.some((g) => g.includes(book[1]) && g.some((w) => has(source, w)))) found.push(book[1])
  if (VERSE.test(output) && !VERSE.test(source)) found.push(':')
  return found
}
