import { describe, expect, it } from 'vitest'
import { looksLikeRomanNepali } from './romanNepali'

describe('looksLikeRomanNepali', () => {
  it('recognises everyday romanized Nepali', () => {
    expect(looksLikeRomanNepali('malai dherai bhok lagyo')).toBe(true)
    expect(looksLikeRomanNepali('tapai lai kasto chha')).toBe(true)
    expect(looksLikeRomanNepali('mero naam ram ho')).toBe(true)
    expect(looksLikeRomanNepali('Tapai lai kasto chha?')).toBe(true)
  })

  it('leaves English alone, even with a word that is also a dictionary key', () => {
    expect(looksLikeRomanNepali('Where is the nearest hospital?')).toBe(false)
    expect(looksLikeRomanNepali('I drink pani every morning')).toBe(false)
    expect(looksLikeRomanNepali('my ma says ho ho')).toBe(false)
    expect(looksLikeRomanNepali('school bus')).toBe(false)
  })

  it('needs more than one word, and no Devanagari', () => {
    expect(looksLikeRomanNepali('malai')).toBe(false)
    expect(looksLikeRomanNepali('')).toBe(false)
    expect(looksLikeRomanNepali('मलाई dherai bhok lagyo')).toBe(false)
  })
})
