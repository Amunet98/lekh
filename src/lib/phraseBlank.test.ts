import { describe, expect, it } from 'vitest'
import { blankToNepali, fillBlank } from './phraseBlank'

describe('blankToNepali', () => {
  it('converts the words the dictionary knows', () => {
    expect(blankToNepali('Thamel')).toBe('ठमेल')
    expect(blankToNepali('kathmandu airport')).toBe('काठमाडौं एयरपोर्ट')
  })
  it('keeps names it does not know exactly as typed', () => {
    expect(blankToNepali('John')).toBe('John')
    expect(blankToNepali('Nagarkot')).toBe('Nagarkot')
  })
  it('mixes the two word by word', () => {
    expect(blankToNepali('Pokhara Lakeside')).toBe('पोखरा Lakeside')
  })
  it('passes Devanagari through', () => {
    expect(blankToNepali('सीता')).toBe('सीता')
  })
  it('never looks a name up: "Jane" is जाने ("to go") in the dictionary', () => {
    expect(blankToNepali('  Sarah   Jane ', 'name')).toBe('Sarah Jane')
    expect(blankToNepali('Hari', 'name')).toBe('Hari')
    expect(blankToNepali('हरि', 'name')).toBe('हरि')
  })
})

describe('fillBlank', () => {
  it('puts the value where the blank was', () => {
    expect(fillBlank('मेरो नाम … हो।', 'Sita', 'name')).toBe('मेरो नाम Sita हो।')
    expect(fillBlank('… कहाँ छ?', 'thamel')).toBe('ठमेल कहाँ छ?')
  })
  it('leaves the line alone while nothing is typed', () => {
    expect(fillBlank('मेरो नाम … हो।', '   ')).toBe('मेरो नाम … हो।')
  })
})
