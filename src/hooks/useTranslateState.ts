import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ENGLISH, NEPALI, type Language } from '../lib/translation/languages'
import { onlineProvider } from '../lib/translation/onlineProvider'
import {
  onDeviceProvider,
  hasConfirmedDownload,
  setConfirmedDownload,
  hasDownloadedModel,
  isModelCached,
} from '../lib/translation/onDeviceProvider'
import { romanizedToDevanagari } from '../lib/engine/romanize'
import type { ModelLoadProgress } from '../lib/translation/provider'

export type TranslateMode = 'online' | 'ondevice'
export type Direction = 'ne-en' | 'en-ne'
type Status = 'idle' | 'loading' | 'error'

// Romanized Nepali ("mero naam") only makes sense to transliterate when
// translating FROM Nepali — English input is Latin by definition, so en-ne
// is left untouched.
function romanizedHint(text: string, direction: Direction): string | null {
  if (direction !== 'ne-en' || !/[a-zA-Z]/.test(text)) return null
  return romanizedToDevanagari(text)
}

export function useTranslateState() {
  const [direction, setDirection] = useState<Direction>('ne-en')
  const [sourceText, setSourceText] = useState('')
  const [translated, setTranslated] = useState('')
  const [mode, setMode] = useState<TranslateMode>('online')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [modelLoad, setModelLoad] = useState<ModelLoadProgress | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  // localStorage isn't reactive — seed from it for an instant paint, then
  // self-heal against the real Cache Storage entry (the flag can go stale
  // in either direction: cache evicted under storage pressure, or flag lost
  // while the cache survives).
  const [modelDownloaded, setModelDownloaded] = useState(() => hasDownloadedModel())
  const debounceRef = useRef<number | undefined>(undefined)
  const requestIdRef = useRef(0)

  useEffect(() => {
    void isModelCached().then(setModelDownloaded)
  }, [])

  const sourceLang: Language = direction === 'ne-en' ? NEPALI : ENGLISH
  const targetLang: Language = direction === 'ne-en' ? ENGLISH : NEPALI

  // Devanagari form of romanized input, shown as an "interpreted as:" hint;
  // null when the source isn't ne-en or contains no Latin letters.
  const interpretedAs = useMemo(() => romanizedHint(sourceText, direction), [sourceText, direction])

  const runOnline = useCallback(async (text: string, source: Language, target: Language, dir: Direction) => {
    if (!text.trim()) {
      setTranslated('')
      setStatus('idle')
      return
    }
    const effectiveSource = romanizedHint(text, dir) ?? text
    const requestId = ++requestIdRef.current
    setStatus('loading')
    try {
      const result = await onlineProvider.translate(effectiveSource, source, target)
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
      void runOnline(sourceText, sourceLang, targetLang, direction)
    }, 500)
    return () => window.clearTimeout(debounceRef.current)
  }, [sourceText, sourceLang, targetLang, direction, mode, runOnline])

  const runOnDevice = useCallback(async () => {
    if (!sourceText.trim()) return
    const effectiveSource = romanizedHint(sourceText, direction) ?? sourceText
    setStatus('loading')
    setError(null)
    try {
      const result = await onDeviceProvider.translate(effectiveSource, sourceLang, targetLang, {
        // 'done' means the model is ready and inference is starting — clear
        // the load UI so the pane shows plain "Translating…" from there.
        onModelProgress: (p) => setModelLoad(p.phase === 'done' ? null : p),
      })
      setTranslated(result)
      setStatus('idle')
      setModelDownloaded(hasDownloadedModel())
    } catch {
      setStatus('error')
      setError('On-device translation failed on this device — switched back to online.')
      setMode('online')
    } finally {
      setModelLoad(null)
    }
  }, [sourceText, sourceLang, targetLang, direction])

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

  const requestOnDevice = useCallback(() => {
    if (hasConfirmedDownload() || hasDownloadedModel()) {
      switchToOnDevice()
    } else {
      setShowConfirm(true)
    }
  }, [switchToOnDevice])

  const confirmDownload = useCallback(() => {
    setConfirmedDownload()
    setShowConfirm(false)
    switchToOnDevice()
  }, [switchToOnDevice])

  const cancelConfirm = useCallback(() => setShowConfirm(false), [])

  return {
    direction,
    sourceLang,
    targetLang,
    sourceText,
    setSourceText,
    translated,
    interpretedAs,
    mode,
    status,
    error,
    modelLoad,
    modelDownloaded,
    showConfirm,
    runOnDevice,
    swap,
    switchToOnDevice,
    switchToOnline,
    requestOnDevice,
    confirmDownload,
    cancelConfirm,
  }
}

export type TranslateState = ReturnType<typeof useTranslateState>
