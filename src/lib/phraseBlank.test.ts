import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { blankToNepali, fillBlank } from './phraseBlank'
import { setWikiWords } from './engine/wiki'

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

describe('with the Wikipedia word list loaded', () => {
  it('finds a place the dictionary lacks when exactly one word sounds like it', () => {
    setWikiWords(readFileSync('src/data/wikiWords.txt', 'utf8'))
    expect(blankToNepali('Nagarkot')).toBe('नगरकोट')
    expect(blankToNepali('Swayambhunath')).toBe('स्वयम्भूनाथ')
    expect(blankToNepali('Jomsom')).toBe('जोमसोम')
    expect(blankToNepali('Ratnapark')).toBe('रत्नपार्क')
  })
  it('leaves an ambiguous one as typed', () => {
    // Patan is पतन ("downfall"), Asan आसन ("seat"), Dharan three words.
    expect(blankToNepali('Patan')).toBe('Patan')
    expect(blankToNepali('Asan')).toBe('Asan')
    expect(blankToNepali('Dharan')).toBe('Dharan')
  })
  it('still never touches a name', () => {
    expect(blankToNepali('John', 'name')).toBe('John')
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
