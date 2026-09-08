import { CONS, VOW, SIGNS } from './maps'

type Token =
  | { kind: 'cons'; value: string }
  | { kind: 'vowel'; value: [string, string] }
  | { kind: 'sign'; value: string }
  | { kind: 'raw'; value: string }

/* Case is meaningful here — T/D/N/Th/Dh/Sh are the retroflexes and A/I/U/E
 * the long vowels — so an exact-case hit always wins at a given length. But
 * only ten capitals carry a meaning, and the other sixteen used to fall
 * through to `raw` and stay Latin in the middle of a Devanagari word: typing a
 * name gave "Bimesh" -> "Bइमेश". Dictionary words never showed it, because
 * convert() lowercases before its lookup, so this only ever bit the words not
 * in the dictionary — which is to say proper nouns, the exact case where
 * someone reaches for a capital.
 *
 * Hence the second pass at each length rather than only at len 1: "Bh" has to
 * find भ as a unit, or lowercasing B alone would give ब + ह ("बहिम" for
 * "Bhim"). Trying both forms longest-first keeps ठ for "Th" and भ for "Bh". */
function matchAt(sub: string): Token | null {
  for (const form of sub === sub.toLowerCase() ? [sub] : [sub, sub.toLowerCase()]) {
    if (Object.hasOwn(CONS, form)) return { kind: 'cons', value: CONS[form] }
    if (Object.hasOwn(VOW, form)) return { kind: 'vowel', value: VOW[form] }
    if (Object.hasOwn(SIGNS, form)) return { kind: 'sign', value: SIGNS[form] }
  }
  return null
}

function tokenize(word: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < word.length) {
    let matched = false
    for (let len = 3; len >= 1 && !matched; len--) {
      const token = matchAt(word.substr(i, len))
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
    } else {
      out += tok.value
    }
  }
  return out
}
