import { useCallback, useEffect, useRef, useState } from 'react'
import { LANGUAGES, NEPALI, type Language } from '../lib/translation/languages'
import { myMemoryProvider } from '../lib/translation/myMemoryProvider'
import { onDeviceProvider } from '../lib/translation/onDeviceProvider'

export type TranslateMode = 'online' | 'ondevice'
type Status = 'idle' | 'loading' | 'error'

export function useTranslateState() {
  const [sourceLang, setSourceLang] = useState<Language>(LANGUAGES[0])
  const [targetLang, setTargetLang] = useState<Language>(NEPALI)
  const [sourceText, setSourceText] = useState('')
  const [translated, setTranslated] = useState('')
  const [mode, setMode] = useState<TranslateMode>('online')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [modelProgress, setModelProgress] = useState<number | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)
  const requestIdRef = useRef(0)

  const runOnline = useCallback(async (text: string, source: Language, target: Language) => {
    if (!text.trim()) {
      setTranslated('')
      setStatus('idle')
      return
    }
    const requestId = ++requestIdRef.current
    setStatus('loading')
    try {
      const result = await myMemoryProvider.translate(text, source, target)
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
    setModelProgress(0)
    try {
      const result = await onDeviceProvider.translate(sourceText, sourceLang, targetLang, {
        onProgress: setModelProgress,
      })
      setTranslated(result)
      setStatus('idle')
    } catch {
      setStatus('error')
      setError('On-device translation failed on this device — switched back to online.')
      setMode('online')
    } finally {
      setModelProgress(null)
    }
  }, [sourceText, sourceLang, targetLang])

  const swap = useCallback(() => {
    setSourceLang(targetLang)
    setTargetLang(sourceLang)
    setSourceText(translated)
    setTranslated(sourceText)
  }, [sourceLang, targetLang, sourceText, translated])

  const switchToOnDevice = useCallback(() => {
    setMode('ondevice')
    setError(null)
  }, [])

  const switchToOnline = useCallback(() => {
    setMode('online')
    setError(null)
  }, [])

  return {
    sourceLang,
    targetLang,
    setSourceLang,
    setTargetLang,
    sourceText,
    setSourceText,
    translated,
    mode,
    status,
    error,
    modelProgress,
    runOnDevice,
    swap,
    switchToOnDevice,
    switchToOnline,
  }
}

export type TranslateState = ReturnType<typeof useTranslateState>
