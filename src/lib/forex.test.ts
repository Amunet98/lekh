import { describe, expect, it } from 'vitest'
import { convert, minusDays, nepalToday, parseNrb, type Rate } from './forex'

const usd: Rate = { iso3: 'USD', name: 'US Dollar', unit: 1, buy: 154.48, sell: 155.08 }
const inr: Rate = { iso3: 'INR', name: 'Indian Rupee', unit: 100, buy: 160, sell: 160.15 }
const jpy: Rate = { iso3: 'JPY', name: 'Japanese Yen', unit: 10, buy: 9.76, sell: 9.8 }

describe('nepalToday', () => {
  it('is already tomorrow in Nepal at 19:00 UTC', () => {
    // 19:00 UTC is 00:45 the next day at UTC+05:45.
    expect(nepalToday(new Date('2026-10-13T19:00:00Z'))).toBe('2026-10-14')
  })
  it('is still today in Nepal at 18:00 UTC', () => {
    expect(nepalToday(new Date('2026-10-13T18:00:00Z'))).toBe('2026-10-13')
  })
})

describe('minusDays', () => {
  it('crosses month and year boundaries', () => {
    expect(minusDays('2026-10-03', 7)).toBe('2026-09-26')
    expect(minusDays('2027-01-02', 7)).toBe('2026-12-26')
  })
})

describe('convert', () => {
  it('uses the buying rate into rupees', () => {
    expect(convert(100, usd, 'toNpr')).toBeCloseTo(15448, 6)
  })
  it('uses the selling rate out of rupees', () => {
    expect(convert(15508, usd, 'fromNpr')).toBeCloseTo(100, 6)
  })
  it('respects the quoted unit', () => {
    expect(convert(100, inr, 'toNpr')).toBeCloseTo(160, 6)
    expect(convert(1000, jpy, 'toNpr')).toBeCloseTo(976, 6)
  })
})

describe('parseNrb', () => {
  const day = (date: string, buy: string) => ({
    date,
    rates: [{ currency: { iso3: 'USD', name: 'U.S. Dollar', unit: 1 }, buy, sell: '155.08' }],
  })

  it('takes the newest day, whatever order they arrive in', () => {
    const sheet = parseNrb({ data: { payload: [day('2026-10-14', '154.48'), day('2026-10-12', '150.00')] } })
    expect(sheet?.date).toBe('2026-10-14')
    expect(sheet?.rates[0]).toEqual({ ...usd })
  })

  it('drops rates that do not parse rather than showing NaN', () => {
    const sheet = parseNrb({
      data: {
        payload: [
          {
            date: '2026-10-14',
            rates: [
              { currency: { iso3: 'USD', name: 'U.S. Dollar', unit: 1 }, buy: 'n/a', sell: '155.08' },
              { currency: { iso3: 'EUR', name: 'European Euro', unit: 1 }, buy: '173.32', sell: '173.99' },
            ],
          },
        ],
      },
    })
    expect(sheet?.rates.map((r) => r.iso3)).toEqual(['EUR'])
    expect(sheet?.rates[0].name).toBe('Euro')
  })

  it('returns null for an empty or foreign shape', () => {
    expect(parseNrb({ data: { payload: [] } })).toBeNull()
    expect(parseNrb({ nope: true })).toBeNull()
    expect(parseNrb(null)).toBeNull()
  })
})
