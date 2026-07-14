import type { TranslationProvider } from './provider'
import { googleProvider } from './googleProvider'
import { myMemoryProvider } from './myMemoryProvider'

// The online mode's provider chain: Google (much better Nepali quality) with
// MyMemory as the automatic fallback. Both are free and keyless; either can
// fail or rate-limit independently, so a blank/failed primary quietly falls
// through instead of surfacing an error the fallback could have absorbed.
export const onlineProvider: TranslationProvider = {
  id: 'online',
  async translate(text, source, target, options) {
    try {
      return await googleProvider.translate(text, source, target, options)
    } catch {
      const result = await myMemoryProvider.translate(text, source, target, options)
      // MyMemory can return HTTP 200 with an empty translation (bad memory
      // entries) — treat that as a failure so the UI shows its error banner
      // instead of silently blanking the output.
      if (!result.trim()) throw new Error('Translation came back empty')
      return result
    }
  },
}
