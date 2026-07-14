import type { TranslationProvider } from './provider'

// Unofficial, keyless Google Translate web endpoint. ToS-gray: undocumented,
// may rate-limit (429) or change response shape without notice — which is why
// this provider is only ever used behind onlineProvider's fallback chain.
// Response is nested arrays: segments live at data[0], each segment is
// [translatedText, sourceText, ...].
export const googleProvider: TranslationProvider = {
  id: 'google',
  async translate(text, source, target) {
    const url =
      'https://translate.googleapis.com/translate_a/single' +
      `?client=gtx&sl=${source.code}&tl=${target.code}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Google translate request failed: ${res.status}`)
    const data: unknown = await res.json()
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error('Google translate returned an unexpected response shape')
    }
    const result = (data[0] as unknown[])
      .map((segment) => (Array.isArray(segment) ? segment[0] : undefined))
      .filter((part): part is string => typeof part === 'string')
      .join('')
    if (!result.trim()) throw new Error('Google translate returned an empty translation')
    return result
  },
}
