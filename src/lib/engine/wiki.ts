/* Common words of the Nepali Wikipedia, as extra suggestion chips (1.9.109).
 *
 * Lekh's own dictionary is ~900 hand-checked entries; this adds the 45,000
 * most frequent words of the Nepali Wikipedia (src/data/wikiWords.txt, built by
 * scripts/build-wiki-words.mjs; CC BY-SA 4.0, credited in that file, the
 * README, About and the cheat sheet). It only ever ADDS chips: what space
 * commits is still convert(), so typing itself does not change, and Lekh's
 * own words rank above these (see suggest.ts).
 *
 * Matching is by a sound skeleton rather than by romanized keys: the typed
 * word is converted as usual, and both it and every list word are reduced to
 * the letters people actually hear apart. ि/ी, ु/ू, श/ष/स, व/ब, the retroflex
 * and dental pairs, ण/ङ/ञ/न with ँ/ं, ै/इ and ौ/उ fold together, and ा, the
 * virama and the nukta drop out. So "sarkar" (सर्कर) finds सरकार, and "bidhyalaya" finds
 * विद्यालय, without a romanization having to be invented for 45,000 words.
 *
 * Loaded lazily (a ~1MB text chunk) once the Type tab is idle; until then
 * suggest() simply has no Wikipedia chips. */

const FOLD: Record<string, string> = {
  'ी': 'ि', 'ू': 'ु', 'ई': 'इ', 'ऊ': 'उ', 'आ': 'अ',
  'श': 'स', 'ष': 'स',
  'व': 'ब',
  'ट': 'त', 'ठ': 'थ', 'ड': 'द', 'ढ': 'ध',
  'ण': 'न', 'ङ': 'न', 'ञ': 'न',
  /* A nasal is typed as n before the next consonant (diunso → दिउन्सो) but
     written ँ or ं (दिउँसो, हुँ, तपाईं): all three are the same sound here. */
  'ँ': 'न', 'ं': 'न',
  'ृ': 'रि', 'ऋ': 'रि',
  /* ai and au as typed (ै ौ) against the written vowel pairs they are said as
     (आइ, आउ): amalai → अमलै must find आमालाई, aun → औन must find आउन. */
  'ऐ': 'अइ', 'ै': 'इ', 'औ': 'अउ', 'ौ': 'उ',
}
const DROP = new Set(['ा', '्', '़'])

/** The word reduced to the sounds people tell apart when they type. */
export function skeleton(word: string): string {
  let out = ''
  for (const ch of word) {
    if (DROP.has(ch)) continue
    out += FOLD[ch] ?? ch
  }
  return out
}

type Entry = { sk: string; word: string }
/* Bucketed by the skeleton's first two characters, each bucket in frequency
   order, so a lookup scans a few hundred entries rather than 45,000. */
let index: Map<string, Entry[]> | null = null
let loading: Promise<void> | null = null

const bucketKey = (sk: string) => [...sk].slice(0, 2).join('')

/** Build the index from the word list's text (one word per line, '#' header). */
export function setWikiWords(text: string): void {
  const next = new Map<string, Entry[]>()
  for (const line of text.split('\n')) {
    const word = line.trim()
    if (!word || word.startsWith('#')) continue
    const sk = skeleton(word)
    if ([...sk].length < 2) continue
    const key = bucketKey(sk)
    let bucket = next.get(key)
    if (!bucket) next.set(key, (bucket = []))
    bucket.push({ sk, word })
  }
  index = next
}

/** Load the list once, off the critical path. Safe to call repeatedly. */
export function loadWikiWords(): Promise<void> {
  if (index) return Promise.resolve()
  loading ??= import('../../data/wikiWords.txt?raw')
    .then((m) => setWikiWords(m.default))
    .catch(() => {
      loading = null // a failed chunk load may succeed next time
    })
  return loading
}

export const wikiReady = () => index !== null

/**
 * Words for a converted Devanagari spelling: first the ones that sound the
 * same (a loose spelling of a real word), then the ones that start the same
 * (completions), each in Wikipedia frequency order. Excludes `dev` itself.
 */
export function wikiMatches(dev: string, opts: { same: number; longer: number }): { same: string[]; longer: string[] } {
  const same: string[] = []
  const longer: string[] = []
  if (!index) return { same, longer }
  const sk = skeleton(dev)
  if ([...sk].length < 2) return { same, longer }
  for (const e of index.get(bucketKey(sk)) ?? []) {
    if (same.length >= opts.same && longer.length >= opts.longer) break
    if (e.word === dev) continue
    if (e.sk === sk) {
      if (same.length < opts.same) same.push(e.word)
    } else if (e.sk.startsWith(sk) && longer.length < opts.longer) {
      longer.push(e.word)
    }
  }
  return { same, longer }
}
