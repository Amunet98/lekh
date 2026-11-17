import { describe, expect, it, vi } from 'vitest'

vi.mock('@capacitor-community/text-to-speech', () => ({ TextToSpeech: {}, QueueStrategy: { Flush: 0, Add: 1 } }))

import { pieces } from './speech'

describe('pieces', () => {
  it('keeps a short line whole', () => {
    expect(pieces('नमस्ते, तपाईंलाई कस्तो छ?')).toEqual(['नमस्ते, तपाईंलाई कस्तो छ?'])
  })

  it('splits a long text at sentence ends, danda included, under the limit', () => {
    const sentence = 'म भोलि काठमाडौं जाँदैछु र त्यहाँ साथीहरूलाई भेट्नेछु। '
    const text = sentence.repeat(80)
    const out = pieces(text)
    expect(out.length).toBeGreaterThan(1)
    for (const p of out) {
      expect(p.length).toBeLessThanOrEqual(1200)
      expect(p.endsWith('।')).toBe(true)
    }
    expect(out.join(' ').replace(/\s+/g, ' ')).toBe(text.trim().replace(/\s+/g, ' '))
  })

  it('cuts a run with no punctuation at a space', () => {
    const text = 'शब्द '.repeat(600)
    const out = pieces(text)
    expect(out.every((p) => p.length <= 1200)).toBe(true)
    expect(out.join(' ').split(/\s+/).filter(Boolean)).toHaveLength(600)
  })

  it('drops empty input', () => {
    expect(pieces('   ')).toEqual([])
  })
})
