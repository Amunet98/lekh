import { describe, expect, it } from 'vitest'
import raw from '../../data/calendar/panchang.json'
import { festivalInfo, festivalInfos } from './festivalsEn'

describe('festivalInfo', () => {
  it('finds the almanac spellings, variants and parentheticals', () => {
    expect(festivalInfo('घटस्थापना')?.en).toMatch(/^Ghatasthapana/)
    expect(festivalInfo('महाष्टमी')?.en).toBe(festivalInfo('महाअष्टमी')?.en)
    expect(festivalInfo('गाईजात्रा (सापारू)')?.en).toBe('Gai Jatra')
    expect(festivalInfo('गाई  पूजा')?.en).toMatch(/Laxmi Puja/) // doubled space
  })

  it('says nothing about a festival it has not been taught', () => {
    expect(festivalInfo('अष्टमीव्रत')).toBeUndefined()
    expect(festivalInfo('द्वादशी')).toBeUndefined()
  })

  it('does not repeat a name two festivals share', () => {
    expect(festivalInfos(['सोनाम ल्होसार', 'तामाङ ल्होछार']).map((i) => i.en)).toEqual(['Sonam Lhosar'])
  })

  it('covers every Dashain and Tihar holiday in the bundled 2083 data', () => {
    const asoj = (raw as { years: Record<string, Record<string, { f: Record<string, string> }>> }).years['2083']
    for (const [month, day] of [['6', '25'], ['6', '31'], ['7', '1'], ['7', '3'], ['7', '4'], ['7', '22'], ['7', '23'], ['7', '24'], ['7', '25']]) {
      const names = asoj[month].f[day].split(',').map((n) => n.trim())
      expect(festivalInfos(names).length, `2083/${month}/${day}`).toBeGreaterThan(0)
    }
  })
})
