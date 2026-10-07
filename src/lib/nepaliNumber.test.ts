import { describe, expect, it } from 'vitest'
import {
  englishAmount,
  englishWords,
  groupNepali,
  nepaliAmount,
  nepaliWords,
  parseAmount,
  toDevanagariDigits,
} from './nepaliNumber'

describe('parseAmount', () => {
  it('reads either script, with or without commas', () => {
    expect(parseAmount('12,500')).toEqual({ whole: 12500, paisa: null })
    expect(parseAmount('१२,५००')).toEqual({ whole: 12500, paisa: null })
    expect(parseAmount(' 350.5 ')).toEqual({ whole: 350, paisa: 50 })
    expect(parseAmount('३५०.०५')).toEqual({ whole: 350, paisa: 5 })
  })

  it('refuses anything that is not a number', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('12a')).toBeNull()
    expect(parseAmount('1.234')).toBeNull()
    expect(parseAmount('1'.repeat(16))).toBeNull()
  })
})

describe('grouping', () => {
  it('groups in lakh and crore', () => {
    expect(groupNepali(999)).toBe('999')
    expect(groupNepali(1000)).toBe('1,000')
    expect(groupNepali(1234567)).toBe('12,34,567')
    expect(groupNepali(123456789)).toBe('12,34,56,789')
    expect(toDevanagariDigits(groupNepali(12500))).toBe('१२,५००')
  })
})

describe('words', () => {
  it('uses the table below a hundred', () => {
    expect(nepaliWords(0)).toBe('शून्य')
    expect(nepaliWords(29)).toBe('उनन्तीस')
    expect(nepaliWords(79)).toBe('उनासी')
    expect(nepaliWords(99)).toBe('उनान्सय')
  })

  it('builds the scales above it', () => {
    expect(nepaliWords(12500)).toBe('बाह्र हजार पाँच सय')
    expect(nepaliWords(125000)).toBe('एक लाख पच्चीस हजार')
    expect(nepaliWords(10000001)).toBe('एक करोड एक')
    expect(englishWords(125000)).toBe('one lakh twenty-five thousand')
    expect(englishWords(2500000000)).toBe('two arab fifty crore')
  })

  it('writes a cheque line', () => {
    expect(nepaliAmount({ whole: 12500, paisa: null })).toBe('बाह्र हजार पाँच सय रुपैयाँ मात्र')
    expect(nepaliAmount({ whole: 350, paisa: 50 })).toBe('तीन सय पचास रुपैयाँ पचास पैसा मात्र')
    expect(englishAmount({ whole: 12500, paisa: null })).toBe('Rupees twelve thousand five hundred only')
    expect(englishAmount({ whole: 1, paisa: 5 })).toBe('Rupees one and five paisa only')
  })
})
