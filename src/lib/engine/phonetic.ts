import { CONS, VOW, SIGNS } from './maps'

type Token =
  | { kind: 'cons'; value: string }
  | { kind: 'vowel'; value: [string, string] }
  | { kind: 'sign'; value: string }
  | { kind: 'raw'; value: string }

function tokenize(word: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < word.length) {
    let matched = false
    for (let len = 3; len >= 1 && !matched; len--) {
      const sub = word.substr(i, len)
      if (Object.hasOwn(CONS, sub)) {
        tokens.push({ kind: 'cons', value: CONS[sub] })
        i += len
        matched = true
      } else if (Object.hasOwn(VOW, sub)) {
        tokens.push({ kind: 'vowel', value: VOW[sub] })
        i += len
        matched = true
      } else if (Object.hasOwn(SIGNS, sub)) {
        tokens.push({ kind: 'sign', value: SIGNS[sub] })
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
