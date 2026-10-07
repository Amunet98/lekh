import { describe, expect, it } from 'vitest'
import { pronounce } from './pronounce'

describe('pronounce', () => {
  it('reads a translated sentence the way it is said', () => {
    expect(pronounce('यो कति खर्च लाग्छ? कृपया मलाई ठमेल लैजानुहोस्।')).toBe(
      'Yo kati kharcha lagchha? Kripaya malai thamel laijanuhos.',
    )
  })

  it('drops a final inherent vowel, but not after a cluster or in a one-letter word', () => {
    expect(pronounce('नेपाल')).toBe('Nepal')
    expect(pronounce('गर्छ')).toBe('Garchha')
    expect(pronounce('छ')).toBe('Chha')
    expect(pronounce('म')).toBe('Ma')
  })

  it('drops a medial one only before ा, ु or ू on a plain consonant', () => {
    expect(pronounce('काठमाडौं')).toBe('Kathmadaun')
    expect(pronounce('तरकारी')).toBe('Tarkari')
    expect(pronounce('ललितपुर')).toBe('Lalitpur')
    expect(pronounce('सहयोग')).toBe('Sahayog')
    expect(pronounce('कृपया')).toBe('Kripaya')
  })

  it('says व as b, and as w inside a cluster', () => {
    expect(pronounce('धन्यवाद')).toBe('Dhanyabad')
    expect(pronounce('स्वागत')).toBe('Swagat')
  })

  it('turns Devanagari digits into 0-9 and leaves Latin alone', () => {
    expect(pronounce('रु. ३५०')).toBe('Ru. 350')
    expect(pronounce('Wi-Fi छ')).toBe('Wi-Fi chha')
  })

  it('says ज्ञ as gy', () => {
    expect(pronounce('ज्ञान')).toBe('Gyan')
  })
})
