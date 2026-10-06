import { CONS, VOW, SIGNS, RI_MATRA, RI_CLUSTER, OM, EYELASH_RA, SEPARATOR } from './maps'

type Token =
  | { kind: 'cons'; value: string }
  | { kind: 'vowel'; value: [string, string] }
  | { kind: 'sign'; value: string }
  | { kind: 'raw'; value: string }
  | { kind: 'break' }

/* Case is meaningful here — T/D/N/Th/Dh/Sh are the retroflexes, as on
 * ashesh, plus the signs M and H — so an exact-case hit always wins at a given
 * length. Every other capital is its lowercase letter; they used to fall
 * through to `raw` and stay Latin in the middle of a Devanagari word: typing a
 * name gave "Bimesh" -> "Bइमेश". Dictionary words never showed it, because
 * convert() lowercases before its lookup, so this only ever bit the words not
 * in the dictionary — which is to say proper nouns, the exact case where
 * someone reaches for a capital.
 *
 * Hence the second pass at each length rather than only at len 1: "Bh" has to
 * find भ as a unit, or lowercasing B alone would give ब + ह ("बहिम" for
 * "Bhim"). Trying both forms longest-first keeps ठ for "Th" and भ for "Bh".
 *
 * M and H are the two capitals that had a mapping and still came out wrong,
 * so the fallthrough fix above never reached them. They are combining marks —
 * the standard types them as `aM` / `aH`, a sign riding a vowel — and word-
 * initially there is nothing under them: "Mohan" gave "ंओहन", an orphan
 * anusvara. There is no position in the layout where a bare ं opens a word, so
 * at index 0 the sign is declined and the lowercase form answers instead: म. */
function matchAt(sub: string, wordInitial: boolean, afterCons: boolean): Token | null {
  for (const form of sub === sub.toLowerCase() ? [sub] : [sub, sub.toLowerCase()]) {
    // The context-dependent tokens first — see RI_MATRA and OM in maps.ts.
    if (form === 'ri^') return { kind: 'raw', value: afterCons ? RI_CLUSTER : 'रि' }
    if (form === 'ri' && afterCons) return { kind: 'vowel', value: ['ऋ', RI_MATRA] }
    if ((form === 'om' || form === 'aum') && !afterCons) return { kind: 'raw', value: OM }
    if (form === 'rr') return { kind: 'raw', value: EYELASH_RA }
    if (form === SEPARATOR) return { kind: 'break' }
    if (Object.hasOwn(CONS, form)) return { kind: 'cons', value: CONS[form] }
    if (Object.hasOwn(VOW, form)) return { kind: 'vowel', value: VOW[form] }
    if (Object.hasOwn(SIGNS, form) && !wordInitial) return { kind: 'sign', value: SIGNS[form] }
  }
  return null
}

function tokenize(word: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < word.length) {
    const prev = tokens[tokens.length - 1]
    const afterCons = prev !== undefined && prev.kind === 'cons'
    let matched = false
    // 4, for `rree`; everything else is 3 or shorter.
    for (let len = 4; len >= 1 && !matched; len--) {
      if (i + len > word.length) continue
      const token = matchAt(word.substr(i, len), i === 0, afterCons)
      if (token) {
        tokens.push(token)
        i += len
        matched = true
      }
    }
    if (!matched) {
      tokens.push({ kind: 'raw', value: word[i] })
      i += 1
    }
  }
  return tokens
}

// Greedy phonetic parser: longest-match romanization tokens, joined with
// implicit halant on consonant clusters and matra/independent vowel choice
// based on what precedes. No dictionary lookup here — see convert().
export function phonetic(word: string): string {
  const tokens = tokenize(word)
  let out = ''
  for (let t = 0; t < tokens.length; t++) {
    const tok = tokens[t]
    const next = tokens[t + 1]
    if (tok.kind === 'cons') {
      out += tok.value
      if (next && next.kind === 'cons') out += '्' // consonant cluster
      // vowel handled on next pass; word-final consonant stays plain
    } else if (tok.kind === 'vowel') {
      const prev = tokens[t - 1]
      out += prev && prev.kind === 'cons' ? tok.value[1] : tok.value[0]
    } else if (tok.kind === 'sign') {
      out += tok.value // combining sign rides on whatever came before
    } else if (tok.kind === 'break') {
      // prints nothing; its only job is to sit between two consonants so the
      // cluster halant above is not added
    } else {
      out += tok.value
    }
  }
  return out
}
