import { describe, expect, it } from 'vitest'
import raw from '../../src/data/calendar/panchang.json'
import { checkMonthTithis } from './tithi-check.mjs'

describe('checkMonthTithis', () => {
  it('passes every month of the bundled table', () => {
    for (const [year, months] of Object.entries(raw.years)) {
      for (const [month, m] of Object.entries(months)) {
        const check = checkMonthTithis(Number(year), Number(month), m.t)
        expect(check.ok, `BS ${year}-${month}: misses ${check.misses.join(' ')}`).toBe(true)
      }
    }
  })

  it('fails a month whose days are a day out of step', () => {
    // Kartik 2083 with the last day wrapped to the front, as upstream's grid draws a long month.
    const t = raw.years['2083']['7'].t
    const wrapped = [t[t.length - 1], ...t.slice(0, -1)]
    const check = checkMonthTithis(2083, 7, wrapped)
    expect(check.ok).toBe(false)
    expect(check.best).toBe(-1) // each day carries the day before's tithi
  })
})
