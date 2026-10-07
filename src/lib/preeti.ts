/* Preeti ↔ Unicode.
 *
 * Preeti is not an encoding, it is a font: Latin keys whose glyphs happen to
 * be Devanagari shapes. Text typed in it is "g]kfn" underneath, and only
 * looks like नेपाल while the Preeti font is applied — paste it anywhere else
 * and it is gibberish. Government offices, banks and schools still keep years
 * of documents that way, so moving text between the two is a daily chore.
 *
 * The hard part is that Preeti stores glyphs in the order they are *drawn*,
 * not the order they are *read*:
 *   - ि is typed before its consonant (lg = नि), because it is drawn left of it;
 *   - the reph र् is typed after its syllable ({ in sd{ = कर्म), because it
 *     sits above the end of it;
 *   - several letters are built from pieces: m adds the stroke that turns उ
 *     into ऊ, भ into झ, प into फ; f after a half letter completes it (Sf = क);
 *     ो is ा + े (f]), and so on.
 * So each direction is a character table plus a reordering pass.
 *
 * The table is the font's layout (the old Nepali typewriter's), written out
 * here and checked key by key against the mapping published with npttf2utf. */

const PREETI_TO_UNICODE: Record<string, string> = {
  // number row
  '`': 'ञ', '~': 'ञ्', '1': 'ज्ञ', '2': 'द्द', '3': 'घ', '4': 'द्ध', '5': 'छ',
  '6': 'ट', '7': 'ठ', '8': 'ड', '9': 'ढ', '0': 'ण्', '-': '(', '=': '.',
  '!': '१', '@': '२', '#': '३', '$': '४', '%': '५', '^': '६', '&': '७',
  '*': '८', '(': '९', ')': '०', '_': ')', '+': 'ं',
  // top row
  q: 'त्र', w: 'ध', e: 'भ', r: 'च', t: 'त', y: 'थ', u: 'ग', i: 'ष्', o: 'य',
  p: 'उ', '[': 'ृ', ']': 'े', '\\': '्',
  Q: 'त्त', W: 'ध्', E: 'भ्', R: 'च्', T: 'त्', Y: 'थ्', U: 'ग्', I: 'क्ष्',
  O: 'इ', P: 'ए', '{': 'र्', '}': 'ै', '|': '्र',
  // home row
  a: 'ब', s: 'क', d: 'म', f: 'ा', g: 'न', h: 'ज', j: 'व', k: 'प', l: 'ि',
  ';': 'स', "'": 'ु',
  A: 'ब्', S: 'क्', D: 'म्', F: 'ँ', G: 'न्', H: 'ज्', J: 'व्', K: 'प्', L: 'ी',
  ':': 'स्', '"': 'ू',
  // bottom row
  z: 'श', x: 'ह', c: 'अ', v: 'ख', b: 'द', n: 'ल', ',': ',', '.': '।', '/': 'र',
  Z: 'श्', X: 'ह्', C: 'ऋ', V: 'ख्', B: 'द्य', N: 'ल्', M: 'ः', '<': '?',
  '>': 'श्र', '?': 'रु',
  // the font's extra glyphs, reached with Alt codes
  'ˆ': 'फ्', '‰': 'झ्', '•': 'ड्ड', '˜': 'ऽ', '›': 'द्र', '¡': 'ज्ञ्', '£': 'घ्',
  '¤': 'झ्', '¥': '्र', '§': 'ट्ट', '©': 'र', 'ª': 'ङ', '«': '्र', '±': '+',
  '´': 'झ', '¶': 'ठ्ठ', '¿': 'रू', 'Å': 'हृ', 'Ë': 'ङ्ग', 'Ì': 'न्न', 'Í': 'ङ्क',
  'Î': 'ङ्ख', 'Ö': '=', '×': '×', 'Ø': '्य', 'Ù': ';', 'Û': '!', 'Ü': '%',
  'Ý': 'ट्ठ', 'ß': 'द्म', 'å': 'द्व', 'ç': 'ॐ', '÷': '/', 'æ': '“', 'Æ': '”',
  '…': '‘', 'Ú': '’', '„': 'ध्र', '‹': 'ङ्घ', '¢': 'द्घ', '°': 'ङ्ढ', '‘': 'ॅ',
}

/* m is not a letter of its own: it is the extra stroke added to whatever
   came before it. */
const STROKE: Record<string, string> = { उ: 'ऊ', भ: 'झ', प: 'फ', त्र: 'क्र', त्त: 'क्त' }

const SIGNS = 'ािीुूृेैोौंःँ'
const AFTER_SIGNS = 'ािीुूृेैोौः' // everything ं/ँ is drawn after

/* The reph, held as a private-use character until it has been moved: a
   plain र् is a half र, which Preeti also has a way to type (/\). */
const REPH = '\ue000'

const LETTER = '[क-ह]'
const CLUSTER = `(?:${LETTER}्)*${LETTER}`

export function preetiToUnicode(input: string): string {
  // 1. Letters, joining m to the letter it completes.
  let out = ''
  for (const ch of input) {
    if (ch === 'm') {
      /* The stroke belongs to the last letter, which may already carry a
         vowel sign typed between the two (q]m is क्रे). */
      const signs = /[ािीुूृेैोौंःँ]*$/.exec(out)![0]
      const base = out.slice(0, out.length - signs.length)
      const hit = Object.keys(STROKE).find((k) => base.endsWith(k))
      if (hit) out = base.slice(0, -hit.length) + STROKE[hit] + signs
      continue
    }
    if (ch === '{') out += REPH
    else out += Object.hasOwn(PREETI_TO_UNICODE, ch) ? PREETI_TO_UNICODE[ch] : ch
  }

  // 2. A half letter completed by ा is the full letter: Sf = क्ा → क. And इ
  //    with the reph-shaped hook drawn over it is ई.
  out = out.replace(/्ा/g, '').replaceAll(`इ${REPH}`, 'ई')

  // 3. ि moves from in front of its cluster to after it, past any half
  //    letters: lZj = ि श् व → श्वि.
  out = out.replace(new RegExp(`ि(${CLUSTER})`, 'g'), '$1ि')

  // 4. The reph moves from after its syllable to in front of it, jumping back
  //    over the vowel signs and the whole cluster: sd{ = क म ◌ → कर्म.
  out = out.replace(new RegExp(`(${CLUSTER}[ािीुूृेैोौंःँ]*)${REPH}`, 'g'), 'र्$1')
  out = out.replaceAll(REPH, 'र्')

  // 5. A vowel sign typed before a ्र or another half letter of the same
  //    cluster goes after it: s'| = क ु ्र → क्रु.
  out = out.replace(new RegExp(`([ािीुूृेैोौ]+)(्${CLUSTER})`, 'g'), '$2$1')

  // 6. ं and ँ are read after any other sign on the letter.
  out = out.replace(new RegExp(`([ंँ])([${AFTER_SIGNS}]+)`, 'g'), '$2$1')

  // 7. Signs built from two pieces.
  out = out
    .replace(/ेा/g, 'ाे')
    .replace(/ैा/g, 'ाै')
    .replace(/अाे/g, 'ओ')
    .replace(/अाै/g, 'औ')
    .replace(/अा/g, 'आ')
    .replace(/एे/g, 'ऐ')
    .replace(/ाे/g, 'ो')
    .replace(/ाै/g, 'ौ')
  // A doubled sign is a typing slip the font hides by overprinting it.
  return out.replace(new RegExp(`([${SIGNS}])\\1+`, 'g'), '$1')
}

/* ---------- Unicode → Preeti ---------- */

/* Full letters. ण, ष and क्ष have no full key of their own: the font draws
   them as the half letter plus ा's stroke. */
const FULL: Record<string, string> = {
  क: 's', ख: 'v', ग: 'u', घ: '3', ङ: 'ª', च: 'r', छ: '5', ज: 'h', झ: 'em',
  ञ: '`', ट: '6', ठ: '7', ड: '8', ढ: '9', ण: '0f', त: 't', थ: 'y', द: 'b',
  ध: 'w', न: 'g', प: 'k', फ: 'km', ब: 'a', भ: 'e', म: 'd', य: 'o', र: '/',
  ल: 'n', व: 'j', श: 'z', ष: 'if', स: ';', ह: 'x',
}

/* Half letters that have a key. The rest are written full with an explicit
   halant (\), which is how Preeti typists write them too. */
const HALF: Record<string, string> = {
  क: 'S', ख: 'V', ग: 'U', घ: '£', च: 'R', ज: 'H', झ: '‰', ञ: '~', ण: '0',
  त: 'T', थ: 'Y', ध: 'W', न: 'G', प: 'K', फ: 'ˆ', ब: 'A', भ: 'E', म: 'D',
  ल: 'N', व: 'J', श: 'Z', ष: 'i', स: ':', ह: 'X',
}

/* Whole clusters with a glyph of their own, longest first. */
const CONJUNCTS: [string, string][] = [
  ['क्ष', 'If'],
  ['ज्ञ', '1'],
  ['त्र', 'q'],
  ['त्त', 'Q'],
  ['क्र', 'qm'],
  ['क्त', 'Qm'],
  ['द्द', '2'],
  ['द्ध', '4'],
  ['द्य', 'B'],
  ['श्र', '>'],
]

const MATRA: Record<string, string> = {
  'ा': 'f', 'ि': 'l', 'ी': 'L', 'ु': "'", 'ू': '"', 'ृ': '[', 'े': ']',
  'ै': '}', 'ो': 'f]', 'ौ': 'f}', 'ं': '+', 'ँ': 'F', 'ः': 'M',
}

const INDEPENDENT: Record<string, string> = {
  अ: 'c', आ: 'cf', इ: 'O', ई: 'O{', उ: 'p', ऊ: 'pm', ऋ: 'C', ए: 'P', ऐ: 'P]',
  ओ: 'cf]', औ: 'cf}', ॐ: 'ç', ऽ: '˜',
}

const OTHER: Record<string, string> = {
  '।': '.', '॥': '..', '?': '<', '(': '-', ')': '_', '.': '=', '+': '±', '=': 'Ö',
  ';': 'Ù', '!': 'Û', '%': 'Ü', '/': '÷', '“': 'æ', '”': 'Æ', '‘': '…', '’': 'Ú',
  ':': 'M',
  '०': ')', '१': '!', '२': '@', '३': '#', '४': '$', '५': '%', '६': '^', '७': '&',
  '८': '*', '९': '(',
}

const isLetter = (ch: string | undefined) => ch !== undefined && ch >= 'क' && ch <= 'ह'

/** The keys for one cluster of consonants — each but the last joined to the
 *  next by a halant in the Unicode — without its vowel signs or a reph.
 *  `endsInHalant` is a cluster that ends in a visible halant (बस्). */
function clusterKeys(letters: string[], endsInHalant: boolean): string {
  let out = ''
  let i = 0
  const isHalf = (at: number) => at < letters.length - 1 || endsInHalant
  while (i < letters.length) {
    const conjunct = CONJUNCTS.find(([dev]) => {
      const parts = dev.split('्')
      return letters.slice(i, i + parts.length).join('्') === dev
    })
    if (conjunct) {
      const span = conjunct[0].split('्').length
      if (!isHalf(i + span - 1)) {
        out += conjunct[1]
        i += span
        continue
      }
      if (conjunct[0] === 'क्ष') {
        out += 'I' // the one conjunct with a half form of its own
        i += span
        continue
      }
    }
    const letter = letters[i]
    // ्र under the last letter is a mark on the full letter, not a half one:
    // प्र is k|, not K|.
    if (letters[i + 1] === 'र' && i + 1 === letters.length - 1 && !endsInHalant) {
      out += FULL[letter] + '|'
      i += 2
      continue
    }
    if (isHalf(i)) out += Object.hasOwn(HALF, letter) ? HALF[letter] : FULL[letter] + '\\'
    else out += FULL[letter]
    i++
  }
  return out
}

export function unicodeToPreeti(input: string): string {
  const chars = [...input.replace(/\u200c|\u200d/g, '')]
  let out = ''
  let i = 0
  while (i < chars.length) {
    const ch = chars[i]
    if (isLetter(ch)) {
      // A reph: र् at the head of a cluster.
      let reph = false
      if (ch === 'र' && chars[i + 1] === '्' && isLetter(chars[i + 2])) {
        reph = true
        i += 2
      }
      const letters: string[] = []
      let endsInHalant = false
      while (isLetter(chars[i])) {
        letters.push(chars[i])
        i++
        if (chars[i] === '्') {
          if (isLetter(chars[i + 1])) {
            i++
            continue
          }
          endsInHalant = true
          i++
        }
        break
      }
      let signs = ''
      let iSign = false
      while (i < chars.length && Object.hasOwn(MATRA, chars[i])) {
        if (chars[i] === 'ि') iSign = true
        else signs += chars[i]
        i++
      }
      let keys = (iSign ? 'l' : '') + clusterKeys(letters, endsInHalant)
      // रु and रू have glyphs of their own.
      if (letters.join('') === 'र' && !iSign && (signs.startsWith('ु') || signs.startsWith('ू'))) {
        keys = signs.startsWith('ु') ? '?' : '¿'
        signs = signs.slice(1)
      }
      /* ं is drawn after the reph, every other sign before it. */
      const nasal = signs.replace(/[^ंँ]/g, '')
      const vowel = signs.replace(/[ंँ]/g, '')
      out += keys + [...vowel].map((s) => MATRA[s]).join('') + (reph ? '{' : '') +
        [...nasal].map((s) => MATRA[s]).join('')
      continue
    }
    if (Object.hasOwn(INDEPENDENT, ch)) out += INDEPENDENT[ch]
    else if (Object.hasOwn(MATRA, ch)) out += MATRA[ch]
    else if (Object.hasOwn(OTHER, ch)) out += OTHER[ch]
    else out += ch
    i++
  }
  return out
}

/** Which way a pasted text most likely needs converting: Devanagari in it
 *  means it is already Unicode. */
export function looksLikeUnicode(text: string): boolean {
  return /[\u0900-\u097f]/.test(text)
}

/* Preeti punctuation that romanized Nepali never needs — ] is े, ; is स, { is
   the reph, / is र — and a capital in the middle of a word, which in Preeti
   is a half letter (dGqL) and in typed romanized Nepali almost never happens
   outside T, D, N, Sh and the M of an anusvara. ? and : only count with a
   letter after them: in Preeti they are रु and स् inside a word, in prose
   they end a question or introduce a list. */
const PREETI_SIGNS = /[\][{};'"/\\|`~+=<>]|[?:][a-zA-Z]|[a-z][A-CE-LO-RT-Z]/

/** Latin text that reads as romanized Nepali (or English) rather than
 *  Preeti — "mero naam kamal ho" rather than "d]/f] gfd sdn xf]". Preeti
 *  spends its vowel keys on consonants (a is ब, e is भ, o is य), so text with
 *  a speaker's share of lowercase vowels and none of Preeti's signs is almost
 *  certainly not Preeti. Measured on the dictionary in four-word runs: about
 *  one run in two hundred misread either way. Single words are much less
 *  certain, which is why the Tools page lets the reader overrule it. */
export function looksLikeRomanized(text: string): boolean {
  if (looksLikeUnicode(text) || PREETI_SIGNS.test(text)) return false
  const letters = text.replace(/[^a-zA-Z]/g, '')
  if (!letters) return false
  const vowels = text.match(/[aeiou]/g)?.length ?? 0
  return vowels / letters.length >= 0.25
}
