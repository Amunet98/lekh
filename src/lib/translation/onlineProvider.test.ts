import { afterEach, describe, expect, it, vi } from 'vitest'
import { ENGLISH, NEPALI } from './languages'
import { googleProvider } from './googleProvider'
import { myMemoryProvider } from './myMemoryProvider'
import { inTargetScript, onlineProvider } from './onlineProvider'
import { phrasebookMatch } from './phrasebookMatch'

afterEach(() => vi.restoreAllMocks())

describe('phrasebookMatch', () => {
  it('answers exact phrases, forgiving case and end punctuation', () => {
    expect(phrasebookMatch('Thank you', 'en')).toBe('धन्यवाद')
    expect(phrasebookMatch('thank you!', 'en')).toBe('धन्यवाद')
    expect(phrasebookMatch('धन्यवाद', 'ne')).toBe('Thank you')
  })

  it('pairs alternatives one to one, or all to the one Nepali word', () => {
    expect(phrasebookMatch('Yes', 'en')).toBe('हो')
    expect(phrasebookMatch('No', 'en')).toBe('होइन')
    expect(phrasebookMatch('Goodbye', 'en')).toBe('नमस्ते')
  })

  it('leaves templates and anything inexact to the translator', () => {
    expect(phrasebookMatch('My name is …', 'en')).toBeNull()
    expect(phrasebookMatch('Thank you very much', 'en')).toBeNull()
  })
})

describe('inTargetScript', () => {
  it('rejects a Nepali answer with no Devanagari', () => {
    expect(inTargetScript('Thank you', 'Gurung', 'ne')).toBe(false)
    expect(inTargetScript('Good morning', 'Good morning', 'ne')).toBe(false)
    expect(inTargetScript('Good morning', 'शुभ प्रभात', 'ne')).toBe(true)
  })

  it('rejects an English answer with no Latin letters, and leaves numbers alone', () => {
    expect(inTargetScript('नमस्ते', 'नमस्ते', 'en')).toBe(false)
    expect(inTargetScript('नमस्ते', 'Hello', 'en')).toBe(true)
    expect(inTargetScript('100', '100', 'ne')).toBe(true)
  })
})

describe('onlineProvider', () => {
  it('refuses a fallback answer that is not in the target script', async () => {
    vi.spyOn(googleProvider, 'translate').mockRejectedValue(new Error('rate limited'))
    vi.spyOn(myMemoryProvider, 'translate').mockResolvedValue('Good morning')
    await expect(onlineProvider.translate('Good morning', ENGLISH, NEPALI)).rejects.toThrow(/untranslated/)
  })

  it('takes a good fallback answer', async () => {
    vi.spyOn(googleProvider, 'translate').mockRejectedValue(new Error('rate limited'))
    vi.spyOn(myMemoryProvider, 'translate').mockResolvedValue('शुभ रात्री')
    await expect(onlineProvider.translate('Good night', ENGLISH, NEPALI)).resolves.toBe('शुभ रात्री')
  })

  it('answers phrasebook phrases without asking any service', async () => {
    const google = vi.spyOn(googleProvider, 'translate')
    await expect(onlineProvider.translate('Thank you', ENGLISH, NEPALI)).resolves.toBe('धन्यवाद')
    expect(google).not.toHaveBeenCalled()
  })
})
