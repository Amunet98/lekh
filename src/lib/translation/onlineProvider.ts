import type { TranslationProvider } from './provider'
import { googleProvider } from './googleProvider'
import { myMemoryProvider } from './myMemoryProvider'
import { phrasebookMatch } from './phrasebookMatch'

// The online mode's provider chain: Google (much better Nepali quality) with
// MyMemory as the automatic fallback. Both are free and keyless; either can
// fail or rate-limit independently, so a blank/failed primary quietly falls
// through instead of surfacing an error the fallback could have absorbed.
/* A fallback answer is only an answer if it is in the target's script.
 *
 * MyMemory is a crowd-sourced memory, and when Google is unavailable it is
 * the only thing standing between the user and an error — which is where it
 * answered "Thank you" with "Gurung" and returned "Good morning" untouched,
 * both marked as perfect matches (2026-10-28). A Nepali answer with no
 * Devanagari in it, or an English one with no Latin letters, is not a
 * translation, so it is treated as the failure it is and the UI says the
 * service is unavailable instead of presenting it. Applied to the fallback
 * only: Google legitimately leaves "iPhone 15" or a name as it is. */
const DEVANAGARI = /[\u0900-\u097F]/
const LATIN = /[A-Za-z]/

export function inTargetScript(source: string, result: string, target: 'en' | 'ne'): boolean {
  if (target === 'ne') return !LATIN.test(source) || DEVANAGARI.test(result)
  return !DEVANAGARI.test(source) || LATIN.test(result)
}

export const onlineProvider: TranslationProvider = {
  id: 'online',
  async translate(text, source, target, options) {
    // The hand-checked phrasebook first, for exactly the phrases it holds.
    const fromPhrasebook = phrasebookMatch(text, source.code === 'ne' ? 'ne' : 'en')
    if (fromPhrasebook) return fromPhrasebook
    try {
      return await googleProvider.translate(text, source, target, options)
    } catch {
      const result = await myMemoryProvider.translate(text, source, target, options)
      // MyMemory can return HTTP 200 with an empty translation (bad memory
      // entries) — treat that as a failure so the UI shows its error banner
      // instead of silently blanking the output.
      if (!result.trim()) throw new Error('Translation came back empty')
      if (!inTargetScript(text, result, target.code === 'ne' ? 'ne' : 'en')) {
        throw new Error('Translation came back untranslated')
      }
      return result
    }
  },
}
