import { describe, expect, it } from 'vitest'
import { CONS, DICT, DIGITS, VARIANTS, VOW, convert, phonetic, suggest } from './index'

/* The engine, tested on what it produces rather than on what it documents.
 *
 * check-cheatsheet.ts already guards one thing: that every plain romanized
 * label in the cheat sheet round-trips to the glyph its cell inserts. That is
 * a consistency check between two files. It says nothing about whether the
 * rules underneath are right — the dental/retroflex split, the implicit
 * halant on a cluster, matra-versus-independent vowel choice, or the
 * dictionary taking precedence over the phonetic fallback. Those are what
 * make typing feel correct, and they were unguarded.
 */

describe('convert', () => {
  it('prefers the dictionary over the phonetic fallback', () => {
    /* Deliberately a word where the two DISAGREE, and the first draft of this
       test got it wrong: it used 'namaste', whose phonetic spelling happens to
       land on exactly the dictionary glyphs, so it passed with the lookup
       ripped out entirely. 506 of the 763 entries differ; a test of this
       branch is worthless unless it uses one of them. */
    expect(DICT['namaskar']).toBeDefined()
    expect(phonetic('namaskar')).not.toBe(DICT['namaskar'])
    expect(convert('namaskar')).toBe(DICT['namaskar'])
  })

  it('returns the dictionary spelling for every single entry', () => {
    // The sweep behind the single case above: no entry may be shadowed or
    // unreachable, whatever the phonetic parser would have said instead.
    const wrong = Object.keys(DICT).filter((key) => convert(key) !== DICT[key])
    expect(wrong).toEqual([])
  })

  it('is case-insensitive for dictionary lookups', () => {
    expect(convert('Namaskar')).toBe(DICT['namaskar'])
  })

  it('converts a bare run of digits to Devanagari', () => {
    expect(convert('2083')).toBe('२०८३')
    expect(convert('0')).toBe(DIGITS['0'])
  })

  it('does not treat a mixed alphanumeric token as a number', () => {
    // The digit branch is anchored (^\d+$), so 'a1' must fall through to the
    // phonetic path rather than being half-converted.
    expect(convert('a1')).not.toBe('a१')
  })

  it('falls back to the phonetic parser for unknown words', () => {
    const madeUp = 'zzqx'
    expect(DICT[madeUp]).toBeUndefined()
    expect(convert(madeUp)).toBe(phonetic(madeUp))
  })
})

describe('phonetic — the rules that make typing feel right', () => {
  it('splits dental from retroflex on letter case', () => {
    // Lowercase is dental, uppercase retroflex. Getting this backwards would
    // be wrong on a large share of everything anyone types.
    expect(phonetic('t')).toBe('त')
    expect(phonetic('T')).toBe('ट')
    expect(phonetic('d')).toBe('द')
    expect(phonetic('D')).toBe('ड')
    expect(phonetic('n')).toBe('न')
    expect(phonetic('N')).toBe('ण')
  })

  it('prefers the longest romanization token', () => {
    // 'chh' must not be parsed as 'ch' + 'h', and 'ksh'/'gy' are single
    // conjuncts rather than clusters. This is the property the comment at the
    // top of maps.ts exists to protect.
    expect(phonetic('chh')).toBe(CONS['chh'])
    expect(phonetic('ksh')).toBe(CONS['ksh'])
    expect(phonetic('gy')).toBe(CONS['gy'])
    expect(phonetic('kh')).toBe(CONS['kh'])
  })

  it('inserts an implicit halant between adjacent consonants', () => {
    // Two consonants in a row are a cluster, and the halant is what joins
    // them. Without it the reader gets an inherent 'a' that was never typed.
    expect(phonetic('kt')).toBe('क्त')
    expect(phonetic('kt')).toContain('्')
  })

  it('leaves a word-final consonant bare', () => {
    expect(phonetic('k')).toBe('क')
    expect(phonetic('k').endsWith('्')).toBe(false)
  })

  it('uses the matra after a consonant and the independent form otherwise', () => {
    // The same vowel has two shapes and the choice is entirely positional.
    const [independent, matra] = VOW['a']
    expect(phonetic('a')).toBe(independent)
    expect(phonetic('ka')).toBe(`${CONS['k']}${matra}`)
  })

  it('passes characters it has no mapping for straight through', () => {
    expect(phonetic('?')).toBe('?')
  })

  it('converts a whole word end to end', () => {
    // 'chha' is the cheat sheet's own worked example of greedy matching:
    // chh -> छ, then 'a' as a matra on it.
    expect(phonetic('chha')).toBe(`${CONS['chh']}${VOW['a'][1]}`)
  })
})

describe('suggest', () => {
  it('returns nothing for an empty input', () => {
    expect(suggest('')).toEqual([])
  })

  it('leads with the deterministic convert() result, marked primary', () => {
    // The contract that matters: the first chip is always exactly what
    // pressing space will commit. If these ever diverge, the suggestion strip
    // is lying about what the space bar does.
    for (const word of ['namaste', 'pani', 'k', 'zzqx', '2083']) {
      const chips = suggest(word)
      expect(chips[0]).toEqual({ text: convert(word), primary: true })
      expect(chips.filter((c) => c.primary)).toHaveLength(1)
    }
  })

  it('offers curated variants for ambiguous romanizations', () => {
    const texts = suggest('pani').map((c) => c.text)
    for (const variant of VARIANTS['pani']) expect(texts).toContain(variant)
  })

  it('never returns duplicate Devanagari', () => {
    for (const word of ['pani', 'ma', 'ki', 'kam', 'na', 'ba']) {
      const texts = suggest(word).map((c) => c.text)
      expect(new Set(texts).size).toBe(texts.length)
    }
  })

  it('caps the strip at five chips', () => {
    // The dictionary is ~700 keys; a common prefix would otherwise flood the
    // strip and push the editor around.
    for (const word of ['ka', 'ma', 'sa', 'ba', 'na']) {
      expect(suggest(word).length).toBeLessThanOrEqual(5)
    }
  })

  it('skips dictionary completions for a single letter', () => {
    // At one character a 700-key prefix search is pure noise, so the only
    // chips should be the conversion and any curated variants.
    const chips = suggest('k')
    const allowed = 1 + (VARIANTS['k']?.length ?? 0)
    expect(chips.length).toBeLessThanOrEqual(allowed)
  })
})

describe('the tables themselves', () => {
  it('maps all ten digits', () => {
    for (let d = 0; d <= 9; d++) expect(DIGITS[String(d)]).toBeDefined()
    expect(new Set(Object.values(DIGITS)).size).toBe(10)
  })

  it('keeps every dictionary key lowercase, since lookup lowercases', () => {
    // A capitalised key would be unreachable: convert() lowercases before
    // looking up, so the entry would silently never be found.
    const bad = Object.keys(DICT).filter((k) => k !== k.toLowerCase())
    expect(bad).toEqual([])
  })

  it('keeps every variant key reachable for the same reason', () => {
    const bad = Object.keys(VARIANTS).filter((k) => k !== k.toLowerCase())
    expect(bad).toEqual([])
  })

  it('never offers a variant identical to what convert() already returns', () => {
    // VARIANTS documents itself as excluding the convert() result; suggest()
    // dedupes as a safety net, but a duplicate here means a wasted chip slot
    // and a table that has drifted from its own comment.
    const drifted = Object.entries(VARIANTS)
      .filter(([key, values]) => values.includes(convert(key)))
      .map(([key]) => key)
    expect(drifted).toEqual([])
  })
})
