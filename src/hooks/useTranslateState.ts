import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ENGLISH, NEPALI, type Language } from '../lib/translation/languages'
import { onlineProvider } from '../lib/translation/onlineProvider'
import {
  onDeviceProvider,
  preloadModel,
  hasConfirmedDownload,
  setConfirmedDownload,
  hasDownloadedModel,
  isModelCached,
} from '../lib/translation/onDeviceProvider'
import { romanizedToDevanagari } from '../lib/engine/romanize'
import { memoryTier } from '../lib/translation/deviceMemory'
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
  const [direction, setDirection] = useState<Direction>('en-ne')
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
  // Guards against a second download being kicked off by an impatient second
  // tap. A ref, not `status`, so the check cannot read a stale closure.
  const downloadingRef = useRef(false)

  useEffect(() => {
    void isModelCached().then(setModelDownloaded)
  }, [])

  const sourceLang: Language = direction === 'ne-en' ? NEPALI : ENGLISH
  const targetLang: Language = direction === 'ne-en' ? ENGLISH : NEPALI

  // navigator.deviceMemory can't change mid-session — compute once rather
  // than on every render.
  const deviceMemoryTier = useMemo(() => memoryTier(), [])

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

  /* Fetch the model without translating.
   *
   * This is what "Download & enable" was always supposed to do. Before, it
   * only flipped the mode: the ~900MB fetch lived inside translate(), and with
   * an empty input the "Translate on-device" button is disabled — so the
   * download had no reachable trigger and the UI showed nothing at all. */
  const downloadModel = useCallback(async () => {
    if (downloadingRef.current) return
    downloadingRef.current = true
    setStatus('loading')
    setError(null)
    try {
      await preloadModel((p) => setModelLoad(p.phase === 'done' ? null : p))
      setModelDownloaded(true)
      setStatus('idle')
    } catch {
      setStatus('error')
      setError('Could not download the on-device model — check your connection and try again.')
    } finally {
      downloadingRef.current = false
      setModelLoad(null)
    }
  }, [])

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
    // Below the trustworthy range entirely — the ~900MB WASM heap this
    // needs won't fit, and the failure isn't even a catchable JS error (see
    // runOnDevice's catch): the WebView's renderer itself gets evicted by
    // the OS mid-load, discarding whatever was on screen. Refusing up front
    // is kinder than a silent reload partway through a download.
    if (deviceMemoryTier === 'low') {
      setError(
        'This device may not have enough memory to run on-device translation — please use Online mode.',
      )
      return
    }
    if (hasConfirmedDownload() || hasDownloadedModel()) {
      switchToOnDevice()
    } else {
      setShowConfirm(true)
    }
  }, [switchToOnDevice, deviceMemoryTier])

  const confirmDownload = useCallback(() => {
    setConfirmedDownload()
    setShowConfirm(false)
    switchToOnDevice()
    // The whole point of the button. Without this it only ever set a flag.
    void downloadModel()
  }, [switchToOnDevice, downloadModel])

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
    deviceMemoryTier,
    showConfirm,
    runOnDevice,
    downloadModel,
    swap,
    switchToOnDevice,
    switchToOnline,
    requestOnDevice,
    confirmDownload,
    cancelConfirm,
  }
}

export type TranslateState = ReturnType<typeof useTranslateState>
