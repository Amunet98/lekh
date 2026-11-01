import type { TranslationProvider } from './provider'

/* Lekh's own server (api/translate.ts), asked when Google's free endpoint
 * refuses. Same origin, so it works in the browser and in the Android app
 * (whose WebView loads the live site). A timeout so a slow or failing server
 * hands over to the last fallback rather than leaving the answer pane on
 * "Translating…". In `vite dev` there is no /api and this fails at once,
 * which is the same hand-over. */
export const lekhProvider: TranslationProvider = {
  id: 'lekh',
  async translate(text, source, target) {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, source: source.code, target: target.code }),
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) throw new Error(`Lekh translate failed: ${res.status}`)
    const data = (await res.json()) as { translation?: unknown }
    if (typeof data.translation !== 'string' || !data.translation.trim()) {
      throw new Error('Lekh translate returned nothing')
    }
    return data.translation
  },
}
