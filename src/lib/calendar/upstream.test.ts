import { describe, expect, it } from 'vitest'
import raw from '../../data/calendar/panchang.json'
import { correctedFestivals, monthCells } from './upstream'

const cell = (n: string, f = '') => ({ n, f })

describe('monthCells', () => {
  it('puts the wrapped last days back at the end', () => {
    // Jestha 2083 as upstream draws it: the 31st in the top-left cell.
    const grid = [cell('३१', 'last'), cell(''), cell(''), cell('१', 'first')]
    for (let d = 2; d <= 30; d++) grid.push(cell(String(d).replace(/\d/g, (x) => '०१२३४५६७८९'[Number(x)])))
    const days = monthCells(grid)!
    expect(days).toHaveLength(31)
    expect(days[0].f).toBe('first')
    expect(days[30].f).toBe('last')
  })

  it('refuses a grid whose numerals skip or repeat', () => {
    expect(monthCells([cell('१'), cell('३')])).toBeNull()
    expect(monthCells([cell('१'), cell('१')])).toBeNull()
    expect(monthCells([cell(''), cell('')])).toBeNull()
  })
})

describe('correctedFestivals', () => {
  it('applies a correction only to the text it was written against', () => {
    expect(correctedFestivals(2083, 7, 22, 'कुकुर तिहार,  नरक चतुर्दशी')).toMatch(/लक्ष्मी पूजा/)
    expect(correctedFestivals(2083, 7, 22, 'कुकुर तिहार, लक्ष्मीपूजा')).toBe('कुकुर तिहार, लक्ष्मीपूजा')
    expect(correctedFestivals(2083, 7, 21, 'काग तिहार')).toBe('काग तिहार')
  })
})

describe('bundled Tihar 2083', () => {
  const kartik = (raw as { years: Record<string, Record<string, { f: Record<string, string> }>> }).years['2083']['7'].f

  it('has Laxmi Puja with Kukur Tihar on Kartik 22, and Gai Puja alone on the 23rd', () => {
    expect(kartik['22']).toMatch(/लक्ष्मी पूजा/)
    expect(kartik['22']).toMatch(/कुकुर तिहार/)
    expect(kartik['23']).toMatch(/गाई पूजा/)
    expect(kartik['23']).not.toMatch(/लक्ष्मी/)
  })
})
