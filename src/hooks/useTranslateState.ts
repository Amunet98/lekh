import { useCallback, useEffect, useRef, useState } from 'react'
import { ENGLISH, NEPALI, type Language } from '../lib/translation/languages'
import { onlineProvider } from '../lib/translation/onlineProvider'
import { onDeviceProvider } from '../lib/translation/onDeviceProvider'
import type { ModelLoadProgress } from '../lib/translation/provider'

export type TranslateMode = 'online' | 'ondevice'
export type Direction = 'ne-en' | 'en-ne'
type Status = 'idle' | 'loading' | 'error'

export function useTranslateState() {
  const [direction, setDirection] = useState<Direction>('ne-en')
  const [sourceText, setSourceText] = useState('')
  const [translated, setTranslated] = useState('')
  const [mode, setMode] = useState<TranslateMode>('online')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [modelLoad, setModelLoad] = useState<ModelLoadProgress | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)
  const requestIdRef = useRef(0)

  const sourceLang: Language = direction === 'ne-en' ? NEPALI : ENGLISH
  const targetLang: Language = direction === 'ne-en' ? ENGLISH : NEPALI

  const runOnline = useCallback(async (text: string, source: Language, target: Language) => {
    if (!text.trim()) {
      setTranslated('')
      setStatus('idle')
      return
    }
    const requestId = ++requestIdRef.current
    setStatus('loading')
    try {
      const result = await onlineProvider.translate(text, source, target)
      if (requestId !== requestIdRef.current) return
      setTranslated(result)
      setStatus('idle')
      setError(null)
    } catch {
      if (requestId !== requestIdRef.current) return
      setStatus('error')
      setError('Translation service is unavailable right now — check your connection or try again shortly.')
    }
  }, [])

  useEffect(() => {
    if (mode !== 'online') return
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      void runOnline(sourceText, sourceLang, targetLang)
    }, 500)
    return () => window.clearTimeout(debounceRef.current)
  }, [sourceText, sourceLang, targetLang, mode, runOnline])

  const runOnDevice = useCallback(async () => {
    if (!sourceText.trim()) return
    setStatus('loading')
    setError(null)
    try {
      const result = await onDeviceProvider.translate(sourceText, sourceLang, targetLang, {
        // 'done' means the model is ready and inference is starting — clear
        // the load UI so the pane shows plain "Translating…" from there.
        onModelProgress: (p) => setModelLoad(p.phase === 'done' ? null : p),
      })
      setTranslated(result)
      setStatus('idle')
    } catch {
      setStatus('error')
      setError('On-device translation failed on this device — switched back to online.')
      setMode('online')
    } finally {
      setModelLoad(null)
    }
  }, [sourceText, sourceLang, targetLang])

  const swap = useCallback(() => {
    setDirection((d) => (d === 'ne-en' ? 'en-ne' : 'ne-en'))
    setSourceText(translated)
    setTranslated(sourceText)
  }, [sourceText, translated])

  const switchToOnDevice = useCallback(() => {
    setMode('ondevice')
    setError(null)
  }, [])

  const switchToOnline = useCallback(() => {
    setMode('online')
    setError(null)
  }, [])

  return {
    direction,
    setDirection,
    sourceLang,
    targetLang,
    sourceText,
    setSourceText,
    translated,
    mode,
    status,
    error,
    modelLoad,
    runOnDevice,
    swap,
    switchToOnDevice,
    switchToOnline,
  }
}

export type TranslateState = ReturnType<typeof useTranslateState>
