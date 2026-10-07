import { describe, expect, it } from 'vitest'
import { buildMonth, nextSaitMonth, parseSaitDays, type RawMonth } from './panchang'

describe('parseSaitDays', () => {
  it('reads the days off the source sentence', () => {
    expect(parseSaitDays(['७, ८, २२, २३, २४, २५, ३० र  ३१ गते'], 31)).toEqual([7, 8, 22, 23, 24, 25, 30, 31])
    expect(parseSaitDays(['२० ,२१ र २३  गते'], 31)).toEqual([20, 21, 23])
  })

  it('treats the "no muhurta this month" sentence as none', () => {
    expect(parseSaitDays(['यो महिना को लागी विवाह मुर्हुत छैन ।'], 31)).toEqual([])
  })

  it('drops numbers outside the month and anything that is not a list', () => {
    expect(parseSaitDays(['५, ३२ र ० गते'], 30)).toEqual([5])
    expect(parseSaitDays(undefined, 30)).toEqual([])
    expect(parseSaitDays('७ गते', 30)).toEqual([])
  })
})

describe('buildMonth', () => {
  const month = (f: Record<string, string>, h: number[]): RawMonth => ({
    f,
    h,
    t: Array.from({ length: 30 }, () => 'प्रतिपदा'),
    m: [3, 9],
    b: [],
  })

  it('treats a "(... मात्र बिदा)" note as a partial holiday, even when flagged', () => {
    const built = buildMonth(
      month({ '13': 'इन्द्रजात्रा(काठमाडौं उपत्यकालाई मात्र विदा)', '14': 'दशैं' }, [13, 14]),
    )
    const valley = built.byDay.get(13)!
    expect(valley.isHoliday).toBe(false)
    expect(valley.partialFor).toBe('काठमाडौं उपत्यकालाई मात्र')
    expect(valley.festivals).toEqual(['इन्द्रजात्रा'])
    expect(built.byDay.get(14)!.isHoliday).toBe(true)
  })

  it('lists partial holidays with the full ones, saying who they are for', () => {
    const built = buildMonth(month({ '29': 'हरितालिका व्रत, तीज(महिला कर्मचारीहरूको लागि मात्र बिदा)' }, []))
    expect(built.holidays).toEqual([
      { day: 29, names: ['हरितालिका व्रत', 'तीज'], partialFor: 'महिला कर्मचारीहरूको लागि मात्र' },
    ])
  })

  it('keeps a bracketed note that is not about a holiday', () => {
    const built = buildMonth(month({ '5': 'गाईजात्रा (सापारू)' }, [5]))
    expect(built.byDay.get(5)!.festivals).toEqual(['गाईजात्रा (सापारू)'])
    expect(built.byDay.get(5)!.isHoliday).toBe(true)
  })

  it('marks the साइत days', () => {
    const built = buildMonth(month({}, []))
    expect(built.marriage).toEqual([3, 9])
    expect(built.byDay.get(9)!.marriage).toBe(true)
    expect(built.byDay.get(10)!.marriage).toBe(false)
  })
})

describe('nextSaitMonth', () => {
  it('finds the next month with wedding dates in the bundled table', () => {
    // Kartik 2083 (index 6) has none; Mangsir 2083 does.
    const next = nextSaitMonth('marriage', 2083, 6)
    expect(next).toMatchObject({ year: 2083, month: 7 })
    expect(next!.days.length).toBeGreaterThan(0)
  })

  it('returns null past the bundled range', () => {
    expect(nextSaitMonth('marriage', 2090, 0)).toBeNull()
  })
})

describe('weekend festivals', () => {
  // Asoj 2083 (month index 5): the 3rd, 17th and 31st are Saturdays.
  const asoj = (f: Record<string, string>, h: number[]): RawMonth => ({
    f,
    h,
    t: Array.from({ length: 31 }, () => 'प्रतिपदा'),
  })

  it('keeps a Saturday festival that is a holiday in its own right', () => {
    const built = buildMonth(asoj({ '3': 'संविधान दिवस (राष्ट्रिय दिवस)', '31': 'फूलपाती' }, [3, 31]), { year: 2083, month: 5 })
    expect(built.holidays.map((h) => h.day)).toEqual([3, 31])
  })

  it('drops a Saturday whose only festivals are observances', () => {
    const built = buildMonth(asoj({ '17': 'अष्टमीव्रत, अष्टमी श्राद्ध' }, [17]), { year: 2083, month: 5 })
    expect(built.holidays).toEqual([])
    expect(built.byDay.get(17)!.isHoliday).toBe(false)
  })

  it('trusts the flag on a weekday', () => {
    const built = buildMonth(asoj({ '9': 'अष्टमीव्रत' }, [9]), { year: 2083, month: 5 })
    expect(built.byDay.get(9)!.isHoliday).toBe(true)
  })
})
