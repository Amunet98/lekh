import { describe, expect, it } from 'vitest'
import { DICT } from './engine/dict'
import { looksLikeRomanized, looksLikeUnicode, preetiToUnicode, unicodeToPreeti } from './preeti'

describe('preetiToUnicode', () => {
  it('reads ¥ as the eyelash र्‍', () => {
    expect(preetiToUnicode('u¥of]')).toBe('गर्‍यो')
  })

  it('reads plain letters and vowel signs', () => {
    expect(preetiToUnicode('g]kfn')).toBe('नेपाल')
    expect(preetiToUnicode('g]kfnL efiff')).toBe('नेपाली भाषा')
  })

  it('moves ि after its cluster', () => {
    expect(preetiToUnicode('lj1fg')).toBe('विज्ञान')
    expect(preetiToUnicode('ljBfno')).toBe('विद्यालय')
  })

  it('moves the reph back over its syllable, mid-word too', () => {
    expect(preetiToUnicode('wd{')).toBe('धर्म')
    expect(preetiToUnicode('sd{sf')).toBe('कर्मका')
  })

  it('joins m and f to the letter they complete', () => {
    expect(preetiToUnicode('k|wfgdGqL')).toBe('प्रधानमन्त्री')
    expect(preetiToUnicode('pm')).toBe('ऊ')
    expect(preetiToUnicode('s[lif')).toBe('कृषि')
    expect(preetiToUnicode('qm]')).toBe('क्रे')
  })

  it('builds ौ and ं in reading order', () => {
    expect(preetiToUnicode('sf7df8f}+')).toBe('काठमाडौं')
  })
})

describe('unicodeToPreeti', () => {
  /* Each of these was checked by rendering it in the Preeti font itself. */
  it('writes the eyelash र्‍ as ¥, not as a reph', () => {
    expect(unicodeToPreeti('गर्‍यो')).toBe('u¥of]')
    expect(unicodeToPreeti('र्‍याली')).toBe('¥ofnL')
    // the plain reph is still a reph
    expect(unicodeToPreeti('गर्यो')).toBe('uof]{')
  })

  it("uses the font's conjunct glyphs instead of halant pairs", () => {
    expect(unicodeToPreeti('द्वारा')).toBe('åf/f')
    expect(unicodeToPreeti('पट्टी')).toBe('k§L')
    expect(unicodeToPreeti('चिठ्ठी')).toBe('lr¶L')
    expect(unicodeToPreeti('अड्डा')).toBe('c•f')
    expect(unicodeToPreeti('सङ्गीत')).toBe(';ËLt')
    expect(unicodeToPreeti('अङ्क')).toBe('cÍ')
    expect(unicodeToPreeti('हृदय')).toBe('Åbo')
    expect(unicodeToPreeti('इन्द्र')).toBe('OG›')
  })

  it('hangs ्र on round letters with « and ्य with Ø', () => {
    expect(unicodeToPreeti('ट्र्याक्टर')).toBe('6«ØfS6/')
    expect(unicodeToPreeti('ड्राइभर')).toBe('8«fOe/')
    expect(unicodeToPreeti('प्रेम')).toBe('k|]d')
    expect(unicodeToPreeti('ठ्याक्कै')).toBe('7ØfSs}')
  })

  it('writes the keys a Preeti typist would', () => {
    expect(unicodeToPreeti('नेपाल')).toBe('g]kfn')
    expect(unicodeToPreeti('धर्म')).toBe('wd{')
    expect(unicodeToPreeti('प्रधानमन्त्री')).toBe('k|wfgdGqL')
    expect(unicodeToPreeti('विद्यालय')).toBe('ljBfno')
  })

  it('round-trips every dictionary word', () => {
    const broken = [...new Set(Object.values(DICT))].filter((w) => preetiToUnicode(unicodeToPreeti(w)) !== w)
    expect(broken).toEqual([])
  })

  it('round-trips the hard cases: rephs, conjuncts, independent vowels', () => {
    for (const w of ['कार्यालय', 'राष्ट्रिय', 'क्षेत्र', 'श्रीमान्', 'तत्त्व', 'उद्घाटन', 'ओखर', 'औषधि', 'ऐना', 'ऊन', 'रुपैयाँ', 'रूप', 'मूर्ति', '२०८३ साल', 'त्रिभुवन', 'क्रिकेट']) {
      expect(preetiToUnicode(unicodeToPreeti(w))).toBe(w)
    }
  })
})

describe('looksLikeUnicode', () => {
  it('tells the two apart by the script in them', () => {
    expect(looksLikeUnicode('नेपाल')).toBe(true)
    expect(looksLikeUnicode('g]kfn')).toBe(false)
  })
})

describe('looksLikeRomanized', () => {
  it('spots romanized Nepali typed into the Preeti box', () => {
    expect(looksLikeRomanized('mero naam kamal ho')).toBe(true)
    expect(looksLikeRomanized('tapaailai kasto chha?')).toBe(true)
  })

  it('leaves real Preeti alone', () => {
    expect(looksLikeRomanized('g]kfn ;/sf/')).toBe(false)
    expect(looksLikeRomanized('d]/f] gfd sdn xf]')).toBe(false)
    expect(looksLikeRomanized('?k}ofF')).toBe(false)
    expect(looksLikeRomanized('नेपाल')).toBe(false)
  })
})
