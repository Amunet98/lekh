/* Devanagari back to plain Latin letters, for someone who cannot read the
 * script and has to say the words out loud — a visitor reading a translation
 * to a taxi driver. Not a transliteration standard: IAST would write ठमेल as
 * "ṭhamēla", which is exact and useless to a tourist. This writes "thamel".
 *
 * What it gives up to be readable:
 *  - vowel length (आ/अ are both "a", ई/इ "i", ऊ/उ "u"), retroflex vs dental
 *    (ट/त are both "t") and श/ष/स distinctions. A listener copes with all of
 *    those; a reader faced with "aa" and "ṭ" mostly does not.
 *  - the inherent vowel at the end of a word is dropped the way it is in
 *    speech (नेपाल → nepal, not nepala), except after a consonant cluster
 *    (गर्छ → garchha) and in one-letter words (छ → chha, म → ma).
 *  - in the middle of a word it is dropped only before a syllable carrying
 *    ा, ु or ू (काठमाडौं → kathmadaun, सरकार → sarkar, ललितपुर → lalitpur).
 *    Nepali keeps far more of these than Hindi does — सहयोग is sahayog — and
 *    the narrow rule gets the common words right without inventing clusters.
 *  - व is "b" except straight after another consonant, where it is "w": that
 *    is how Nepali says it (धन्यवाद → dhanyabad, स्वागत → swagat).
 *
 * Devanagari digits come out as 0–9, which is the other thing a visitor
 * cannot read: रु. ३५० → Ru. 350. Anything that is not Devanagari passes
 * through untouched. */

const CONSONANTS: Record<string, string> = {
  क: 'k', ख: 'kh', ग: 'g', घ: 'gh', ङ: 'ng',
  च: 'ch', छ: 'chh', ज: 'j', झ: 'jh', ञ: 'n',
  ट: 't', ठ: 'th', ड: 'd', ढ: 'dh', ण: 'n',
  त: 't', थ: 'th', द: 'd', ध: 'dh', न: 'n',
  प: 'p', फ: 'ph', ब: 'b', भ: 'bh', म: 'm',
  य: 'y', र: 'r', ल: 'l', व: 'b', श: 'sh',
  ष: 'sh', स: 's', ह: 'h', ळ: 'l',
}

/* Clusters that are not said the way their letters spell. Read as a unit,
   ahead of the letter-by-letter pass. */
const CLUSTERS: [string, string][] = [['ज्ञ', 'gy']]

const VOWELS: Record<string, string> = {
  अ: 'a', आ: 'a', इ: 'i', ई: 'i', उ: 'u', ऊ: 'u', ऋ: 'ri',
  ए: 'e', ऐ: 'ai', ओ: 'o', औ: 'au',
}

const MATRAS: Record<string, string> = {
  'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
}

const HALANT = '्'
const LABIALS = new Set(['प', 'फ', 'ब', 'भ', 'म'])
const SCHWA_DROPPING = new Set(['ा', 'ु', 'ू'])
/* …but not when that syllable opens on a glide: कृपया is kripaya, not kripya. */
const SCHWA_KEEPING_ONSETS = new Set(['य', 'व', 'ह'])

interface Unit {
  /** Latin for the consonant (or cluster), '' for a bare vowel. */
  roman: string
  isConsonant: boolean
  afterHalant: boolean
}

function romanizeWord(word: string): string {
  const chars = [...word.replace(/\u200c|\u200d|\u093c/g, '')]
  let out = ''
  /* Where the last inherent "a" was written. -1 once anything else follows
     it, or when it cannot be dropped at all (straight after a cluster). */
  let pendingSchwa = -1
  let schwaInFirst = false
  let syllables = 0

  /* One consonant (or a CLUSTERS entry) and whatever vowel follows it. */
  const consonant = (unit: Unit, dev: string, next: string | undefined): number => {
    if (
      !unit.afterHalant &&
      !SCHWA_KEEPING_ONSETS.has(dev) &&
      next !== undefined &&
      SCHWA_DROPPING.has(next) &&
      pendingSchwa === out.length - 1 &&
      !schwaInFirst
    ) {
      out = out.slice(0, -1)
    }
    out += unit.roman
    if (next === HALANT) {
      pendingSchwa = -1
      return 1
    }
    syllables++
    if (next !== undefined && Object.hasOwn(MATRAS, next)) {
      out += MATRAS[next]
      pendingSchwa = -1
      return 1
    }
    out += 'a'
    pendingSchwa = unit.afterHalant ? -1 : out.length - 1
    schwaInFirst = syllables === 1
    return 0
  }

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const afterHalant = chars[i - 1] === HALANT
    const cluster = CLUSTERS.find(([dev]) => chars.slice(i, i + [...dev].length).join('') === dev)
    if (cluster) {
      const len = [...cluster[0]].length
      i += len - 1
      i += consonant({ roman: cluster[1], isConsonant: true, afterHalant }, cluster[0], chars[i + 1])
    } else if (Object.hasOwn(CONSONANTS, ch)) {
      const roman = ch === 'व' && afterHalant ? 'w' : CONSONANTS[ch]
      i += consonant({ roman, isConsonant: true, afterHalant }, ch, chars[i + 1])
    } else if (Object.hasOwn(VOWELS, ch)) {
      out += VOWELS[ch]
      syllables++
      pendingSchwa = -1
    } else if (ch === 'ं' || ch === 'ँ') {
      const next = chars[i + 1]
      out += next !== undefined && LABIALS.has(next) ? 'm' : 'n'
    } else if (ch === 'ः') {
      out += 'h'
    } else if (ch === 'ॐ') {
      out += 'om'
      syllables++
    } else if (ch >= '०' && ch <= '९') {
      out += String(ch.charCodeAt(0) - '०'.charCodeAt(0))
    } else if (ch === '।' || ch === '॥') {
      out += '.'
    } else {
      out += ch
    }
  }
  if (pendingSchwa === out.length - 1 && syllables > 1) out = out.slice(0, -1)
  return out
}

/** Readable Latin for Devanagari text — see the note at the top. */
export function pronounce(text: string): string {
  const roman = text.replace(/[\u0900-\u097f\u200c\u200d]+/g, romanizeWord)
  // A capital where a sentence starts, which is most of what makes a line
  // of romanized Nepali look like a sentence rather than a code.
  return roman.replace(/(^|[.?!]\s+)([a-z])/g, (_, lead: string, c: string) => lead + c.toUpperCase())
}
