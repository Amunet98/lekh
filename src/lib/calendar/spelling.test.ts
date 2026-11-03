import { describe, expect, it } from 'vitest'
import raw from '../../data/calendar/panchang.json'
import { fixFestivalText, fixTithi } from './spelling'
import { festivalInfo } from './festivalsEn'

describe('fixTithi', () => {
  it('corrects the almanac’s misspelt tithis and leaves the rest', () => {
    expect(fixTithi('द्दितीया')).toBe('द्वितीया')
    expect(fixTithi('पुर्णिमा')).toBe('पूर्णिमा')
    expect(fixTithi('औशी')).toBe('औंसी')
    expect(fixTithi(' नवमी ')).toBe('नवमी')
  })
})

describe('fixFestivalText', () => {
  it('fixes typos and one-name-many-spellings', () => {
    expect(fixFestivalText('धन्तेरस, यमदीपदान')).toBe('धनतेरस, यमदीप दान')
    expect(fixFestivalText('वसन्तपञ्यमी')).toBe('वसन्त पञ्चमी')
    expect(fixFestivalText('बाला चतुदर्शी')).toBe('बाला चतुर्दशी')
    expect(fixFestivalText('रविसप्तमी')).toBe('रवि सप्तमी')
    expect(fixFestivalText('दर्शैको टीका २०८१')).toBe('दशैंको टीका २०८१')
  })

  it('turns an ASCII colon after Devanagari into a visarga', () => {
    expect(fixFestivalText('अनला चःह्रे:')).toBe('अनला चःह्रेः')
  })

  it('separates व्रत and spaces a parenthetical, and spells बिदा', () => {
    expect(fixFestivalText('अष्टमीव्रत')).toBe('अष्टमी व्रत')
    expect(fixFestivalText('घोडेजात्रा(काठमाडौं उपत्यकालाई मात्र विदा)')).toBe('घोडे जात्रा (काठमाडौं उपत्यकालाई मात्र बिदा)')
    expect(fixFestivalText('तीज(महिला कर्मचारीहरुको लागि मात्र बिदा)')).toBe('तीज (महिला कर्मचारीहरूको लागि मात्र बिदा)')
  })

  it('is idempotent', () => {
    for (const s of ['धन्तेरस', 'गुरूनानक जयन्ती(शिख धर्मावलम्बीहरूका लागि मात्र बिदा)', 'सिथीः नख', 'महाष्टमी']) {
      expect(fixFestivalText(fixFestivalText(s))).toBe(fixFestivalText(s))
    }
  })

  it('leaves the bundled data already fixed', () => {
    const years = (raw as { years: Record<string, Record<string, { f: Record<string, string>; t: string[] }>> }).years
    for (const months of Object.values(years)) {
      for (const m of Object.values(months)) {
        for (const text of Object.values(m.f)) expect(fixFestivalText(text)).toBe(text)
        for (const t of m.t) expect(fixTithi(t)).toBe(t)
      }
    }
  })

  it('still finds the English for a name in either spelling', () => {
    expect(festivalInfo('धन्तेरस')?.en).toBe('Dhanteras')
    expect(festivalInfo('धनतेरस')?.en).toBe('Dhanteras')
    expect(festivalInfo('गुरूनानक जयन्ती')?.en).toBe(festivalInfo('गुरु नानक जयन्ती')?.en)
    expect(festivalInfo('रमा एकादशी')?.en).toBe('Rama Ekadashi')
  })
})
