import type { TranslationProvider } from './provider'

interface MyMemoryResponse {
  responseStatus: number | string
  responseDetails?: string
  responseData: { translatedText: string }
}

export const myMemoryProvider: TranslationProvider = {
  id: 'mymemory',
  async translate(text, source, target) {
    const langpair = `${source.code}|${target.code}`
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`MyMemory request failed: ${res.status}`)
    const data = (await res.json()) as MyMemoryResponse
    if (Number(data.responseStatus) !== 200) {
      throw new Error(data.responseDetails || 'MyMemory translation failed')
    }
    return data.responseData.translatedText
  },
}
