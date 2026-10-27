import { describe, expect, it } from 'vitest'
import { looksLikeEnglish, looksLikeRomanNepali } from './romanNepali'

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

describe('looksLikeEnglish', () => {
  it('recognises English typed while the direction says Nepali', () => {
    expect(looksLikeEnglish('hello my friend, how are you today')).toBe(true)
    expect(looksLikeEnglish('hello friend')).toBe(true)
    expect(looksLikeEnglish('Where is the nearest hospital?')).toBe(true)
  })

  it('leaves romanized Nepali alone, even with an English word in it', () => {
    expect(looksLikeEnglish('mero naam bimesh ho')).toBe(false)
    expect(looksLikeEnglish('malai dherai bhok lagyo')).toBe(false)
    expect(looksLikeEnglish('ma ghar jaanchhu please')).toBe(false)
  })

  it('needs more than one word, and no Devanagari', () => {
    expect(looksLikeEnglish('hello')).toBe(false)
    expect(looksLikeEnglish('नमस्ते my friend')).toBe(false)
  })
})
