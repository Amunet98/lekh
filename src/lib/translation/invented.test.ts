import { describe, expect, it } from 'vitest'
import { inventedMarkers } from './invented'

describe('inventedMarkers', () => {
  it('catches the invented Bible quote the owner got', () => {
    const out = 'The Bible says: "The heart is greater than the riches". - 1 John 2:15.'
    expect(inventedMarkers('धन भन्दा ठूलो मन हो', out)).toEqual(['Bible', 'John', ':'])
  })
  it('catches it in Nepali too', () => {
    expect(inventedMarkers('A big heart is worth more than wealth', 'बाइबलले भन्छ: धनभन्दा मन ठूलो हो। यूहन्ना २:१५')).toEqual(
      expect.arrayContaining(['बाइबलले', 'यूहन्ना', ':']),
    )
  })
  it('leaves ordinary translations alone', () => {
    expect(inventedMarkers('मेरो नाम जोन हो', 'My name is John')).toEqual([])
    expect(inventedMarkers('भगवानले रक्षा गरून्', 'May God protect you')).toEqual([])
    expect(inventedMarkers('बैठक ३ बजे हो', 'The meeting is at 3 pm')).toEqual([])
    expect(inventedMarkers('Where is the bus stop?', 'बस स्टप कहाँ छ?')).toEqual([])
  })
  it('does not flag what the source itself says', () => {
    expect(inventedMarkers('I read the Bible every day', 'म हरेक दिन बाइबल पढ्छु')).toEqual([])
    expect(inventedMarkers('The train leaves at 10:30', 'रेल १०:३० मा छुट्छ')).toEqual([])
  })
})
