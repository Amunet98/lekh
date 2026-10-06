// The pattern is ashesh.com.np's romanized Nepali Unicode converter — the
// one most Nepali typists already know — so a key gives here what it gives
// there (owner's call, 2026-10-06). Lekh's older spellings that do not clash
// with it (M, H, ~, ee/ii, uu) still work as aliases.
//
// Longest-match-first romanization tables. Keys are checked 3/2/1 chars long
// in phonetic.ts, so multi-char keys (chh, ksh, gy, sh, ...) must stay here
// even though single-char keys could theoretically compose them — greedy
// matching on the multi-char form is what makes "chha" -> छ + ा work.
export const CONS: Record<string, string> = {
  chh: 'छ',
  ksh: 'क्ष',
  gy: 'ज्ञ',
  kh: 'ख',
  gh: 'घ',
  ch: 'च',
  jh: 'झ',
  Th: 'ठ',
  Dh: 'ढ',
  th: 'थ',
  dh: 'ध',
  ph: 'फ',
  bh: 'भ',
  sh: 'श',
  Sh: 'ष',
  ng: 'ङ',
  // ञ is `yna`, so `ny` is a plain न + य cluster: धन्यवाद, न्याय, अन्य.
  yn: 'ञ',
  SH: 'ष',
  k: 'क',
  g: 'ग',
  c: 'क', // ashesh: `ca` is क; च is `ch`
  j: 'ज',
  T: 'ट',
  D: 'ड',
  N: 'ण',
  t: 'त',
  d: 'द',
  n: 'न',
  p: 'प',
  f: 'फ',
  b: 'ब',
  m: 'म',
  y: 'य',
  r: 'र',
  l: 'ल',
  w: 'व',
  v: 'व',
  s: 'स',
  h: 'ह',
  x: 'क्स', // ashesh: `xa` is क्स; क्ष is `ksh`
  q: 'क',
  z: 'ज',
}

// [independent form, matra] — matra is appended after a preceding consonant,
// independent form is used word-initially / after another vowel.
export const VOW: Record<string, [string, string]> = {
  rree: ['ॠ', 'ॄ'],
  rri: ['ऋ', 'ृ'],
  aa: ['आ', 'ा'],
  ai: ['ऐ', 'ै'],
  au: ['औ', 'ौ'],
  ee: ['ई', 'ी'],
  ii: ['ई', 'ी'],
  oo: ['ऊ', 'ू'],
  uu: ['ऊ', 'ू'],
  a: ['अ', ''],
  i: ['इ', 'ि'],
  u: ['उ', 'ु'],
  e: ['ए', 'े'],
  o: ['ओ', 'ो'],
  // No capital vowels: on ashesh only T, D, N and Sh are case-sensitive, so
  // `A` is `a` and "Anil" is अनिल.
}

/* `ri` straight after a consonant is the vowel sign ृ (kri → कृ, prithvi →
 * पृथ्वी), as on ashesh; anywhere else it is र + ि (Hari → हरि). `ri^` asks
 * for the र-cluster instead: kri^ket → क्रिकेट. Applied in phonetic.ts,
 * because which one applies depends on the token before it. */
export const RI_MATRA = 'ृ'
export const RI_CLUSTER = '्रि'

/* Whole-token specials. ॐ only where a vowel could start (`om`, `aum`), and
 * `rr` is the eyelash र्‍. `/` keeps two letters apart that would otherwise
 * join: it prints nothing and stops the implicit halant. */
export const OM = 'ॐ'
export const EYELASH_RA = 'र्‍'
export const SEPARATOR = '/'

export const DIGITS: Record<string, string> = {
  '0': '०',
  '1': '१',
  '2': '२',
  '3': '३',
  '4': '४',
  '5': '५',
  '6': '६',
  '7': '७',
  '8': '८',
  '9': '९',
}

// Signs ride whatever comes before them, so none of them can open a word.
export const SIGNS: Record<string, string> = {
  '**': 'ँ', // ashesh's chandrabindu
  '*': 'ं', // ashesh's anusvara
  '\\': '्', // an explicit halant, for a word-final one: bas\ → बस्
  M: 'ं', // Lekh's older anusvara, kept
  H: 'ः',
  '~': 'ँ', // Lekh's older chandrabindu, kept
}
