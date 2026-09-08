import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ENGLISH, NEPALI, type Language } from '../lib/translation/languages'
import { onlineProvider } from '../lib/translation/onlineProvider'
import { chunkText } from '../lib/translation/chunk'
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
import { shareText } from '../lib/share'
import { warn } from '../lib/haptics'
import { getPref, setPref } from '../lib/prefs'
import { useUndoableClear } from './useUndoableClear'

export type TranslateMode = 'online' | 'ondevice'
export type Direction = 'ne-en' | 'en-ne'
type Status = 'idle' | 'loading' | 'error'
export interface ChunkProgress {
  current: number
  total: number
}

const SOURCE_TEXT_KEY = 'lekh:translate-source-text'
const RESULT_KEY = 'lekh:translate-result'

function getInitialSourceText(): string {
  try {
    return localStorage.getItem(SOURCE_TEXT_KEY) ?? ''
  } catch {
    return ''
  }
}

/* A finished translation, stored with enough of its provenance to know
 * whether it still describes what is on screen.
 *
 * The source text has survived a relaunch since it shipped and the result
 * never did, which is the one combination that reads as a bug: the app
 * reopens showing your sentence above an empty answer, and on-device getting
 * it back costs a ~900MB model load and about twenty seconds for a sentence
 * that was already translated. Verified on a phone — force-stop, relaunch,
 * input restored, output gone.
 *
 * Everything a result depends on is stored beside it, because a translation is
 * only meaningful as an answer to a specific question: the same words pointed
 * the other way are a different answer, and the app already treats a mode
 * switch as invalidating (see switchToOnDevice). Any mismatch and this is
 * simply not restored.
 */
interface StoredResult {
  source: string
  direction: Direction
  mode: TranslateMode
  translated: string
}

function readStoredResult(): StoredResult | null {
  try {
    const raw = localStorage.getItem(RESULT_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const r = parsed as Record<string, unknown>
    if (typeof r.source !== 'string' || typeof r.translated !== 'string') return null
    if (r.direction !== 'ne-en' && r.direction !== 'en-ne') return null
    if (r.mode !== 'online' && r.mode !== 'ondevice') return null
    return { source: r.source, direction: r.direction, mode: r.mode, translated: r.translated }
  } catch {
    // Blocked storage, or something older wrote a shape this version does not
    // know. Either way there is simply no result to restore.
    return null
  }
}

/* Online mode is deliberately not restored, and that is not an oversight.
 * Its debounced effect re-translates whatever source text it launches with
 * inside 500ms, and runOnline blanks the pane before it fetches — so a
 * restored result there would appear, vanish, and come back, which is worse
 * than never showing it. On-device has no such loop: nothing runs until the
 * button is pressed, which is exactly why it is the mode where the loss hurt.
 */
function getInitialTranslated(sourceText: string, direction: Direction, mode: TranslateMode): string {
  if (mode !== 'ondevice') return ''
  const stored = readStoredResult()
  if (!stored) return ''
  if (stored.source !== sourceText || stored.direction !== direction || stored.mode !== mode) return ''
  return stored.translated
}

// Romanized Nepali ("mero naam") only makes sense to transliterate when
// translating FROM Nepali — English input is Latin by definition, so en-ne
// is left untouched.
function romanizedHint(text: string, direction: Direction): string | null {
  if (direction !== 'ne-en' || !/[a-zA-Z]/.test(text)) return null
  return romanizedToDevanagari(text)
}

export function useTranslateState() {
  /* Both of these used to reset to their defaults on every single launch,
     which meant someone who mostly translates Nepali into English re-set the
     direction every time they opened the app. Persisted through prefs, and
     kept as booleans there so the stored value cannot go stale if these union
     types are ever renamed. */
  const [direction, setDirection] = useState<Direction>(() =>
    getPref('translateReversed') ? 'ne-en' : 'en-ne',
  )
  const [sourceText, setSourceText] = useState(getInitialSourceText)
  const [mode, setMode] = useState<TranslateMode>(() =>
    getPref('translateOnDevice') ? 'ondevice' : 'online',
  )
  /* Declared after direction and mode rather than beside the other text state,
     because a stored result is only worth restoring when it still matches
     both — and a useState initializer can only read what is already above it. */
  const [translated, setTranslated] = useState(() =>
    getInitialTranslated(sourceText, direction, mode),
  )
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [modelLoad, setModelLoad] = useState<ModelLoadProgress | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [copied, setCopied] = useState(false)
  // Only set while a chunked (multi-request) translation is running — null
  // for the common single-chunk case, so short translations render exactly
  // as they always have.
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null)
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

  useEffect(() => {
    try {
      localStorage.setItem(SOURCE_TEXT_KEY, sourceText)
    } catch {
      // localStorage unavailable — source text still works this visit, just won't survive a reload
    }
  }, [sourceText])

  /* Only while idle, which is what keeps a half-finished answer out of storage:
     a chunked translation calls setTranslated once per chunk, and each of those
     is a prefix of the whole thing that would be restored later looking
     complete. Storing nothing at all mid-run also leaves the previous result
     alone until the new one has actually landed. */
  useEffect(() => {
    if (status !== 'idle') return
    try {
      if (translated) {
        const record: StoredResult = { source: sourceText, direction, mode, translated }
        localStorage.setItem(RESULT_KEY, JSON.stringify(record))
      } else {
        localStorage.removeItem(RESULT_KEY)
      }
    } catch {
      // Blocked storage — the result is still on screen for this visit.
    }
  }, [translated, sourceText, direction, mode, status])

  /* Written wherever they change rather than at every setter call site —
     mode is set from five places (the toggle, the confirm dialog, the
     out-of-memory fallback) and one of them would eventually be missed. */
  useEffect(() => {
    setPref('translateReversed', direction === 'ne-en')
  }, [direction])

  useEffect(() => {
    setPref('translateOnDevice', mode === 'ondevice')
  }, [mode])

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
    // A long upload otherwise gets stuffed whole into one GET request — both
    // providers either reject or fail outright past a few hundred characters
    // (MyMemory's ~500-char anonymous cap, and Google's endpoint on a long
    // enough query string). Chunking keeps every request small regardless of
    // document length; a chunks.length of 1 is the same request as before.
    const chunks = chunkText(effectiveSource)
    const requestId = ++requestIdRef.current
    setStatus('loading')
    setTranslated('')
    if (chunks.length > 1) setChunkProgress({ current: 0, total: chunks.length })
    try {
      const results: string[] = []
      for (const chunk of chunks) {
        const piece = await onlineProvider.translate(chunk, source, target)
        if (requestId !== requestIdRef.current) return
        results.push(piece)
        setTranslated(results.join('\n\n'))
        if (chunks.length > 1) setChunkProgress({ current: results.length, total: chunks.length })
      }
      setStatus('idle')
      setError(null)
    } catch {
      if (requestId !== requestIdRef.current) return
      setStatus('error')
      warn()
      setError(
        chunks.length > 1
          ? 'Translation service is unavailable right now — part of this document translated before the connection dropped.'
          : 'Translation service is unavailable right now — check your connection or try again shortly.',
      )
    } finally {
      if (requestId === requestIdRef.current) setChunkProgress(null)
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
    // Same reasoning as runOnline's chunking: NLLB's practical input length
    // is well below what a whole uploaded document can run to, and nothing
    // here truncates on its own — a chunks.length of 1 is the same single
    // inference call as before.
    const chunks = chunkText(effectiveSource)
    setStatus('loading')
    setError(null)
    setTranslated('')
    if (chunks.length > 1) setChunkProgress({ current: 0, total: chunks.length })
    try {
      const results: string[] = []
      for (const chunk of chunks) {
        const piece = await onDeviceProvider.translate(chunk, sourceLang, targetLang, {
          // 'done' means the model is ready and inference is starting — clear
          // the load UI so the pane shows plain "Translating…" from there.
          onModelProgress: (p) => setModelLoad(p.phase === 'done' ? null : p),
        })
        results.push(piece)
        setTranslated(results.join('\n\n'))
        if (chunks.length > 1) setChunkProgress({ current: results.length, total: chunks.length })
      }
      setStatus('idle')
      setModelDownloaded(hasDownloadedModel())
    } catch {
      setStatus('error')
      warn()
      setError(
        chunks.length > 1
          ? 'On-device translation failed partway through this document — switched back to online.'
          : 'On-device translation failed on this device — switched back to online.',
      )
      setMode('online')
    } finally {
      setModelLoad(null)
      setChunkProgress(null)
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
      warn()
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

  // Direction-only — unlike swap(), does not carry text across. For the
  // wrong-direction-upload recovery flow: the source text is about to be
  // replaced by a fresh OCR pass anyway, so swapping the old translated text
  // into place first would just be discarded a moment later.
  const setDirectionOnly = useCallback((d: Direction) => setDirection(d), [])

  // Wipes a translation that no longer describes the current source text —
  // without this, re-uploading a new photo in on-device mode (which only
  // translates on an explicit button press) leaves whatever was translated
  // last on screen, and it is easy to mistake that leftover for a fresh
  // result. Online mode doesn't need this: its debounced effect below
  // overwrites `translated` within ~500ms of any sourceText change anyway.
  const clearTranslation = useCallback(() => {
    setTranslated('')
    setError(null)
    setStatus('idle')
  }, [])

  /* The Type tab has had a six-second undo on clear since it shipped; this
     screen had the same button doing the same irreversible thing with no way
     back. Only the text returns — a cleared upload's thumbnail does not,
     because the recognized text is the part worth six seconds. */
  const undoable = useUndoableClear()

  const clearSource = useCallback(() => {
    undoable.remember(sourceText)
    setSourceText('')
    clearTranslation()
  }, [sourceText, clearTranslation, undoable])

  const undoClearSource = useCallback(() => {
    const restored = undoable.undo()
    if (restored !== null) setSourceText(restored)
  }, [undoable])

  const copy = useCallback(async () => {
    if (!translated) return
    await navigator.clipboard.writeText(translated)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }, [translated])

  const share = useCallback(async () => {
    if (!translated) return
    await shareText(translated)
  }, [translated])

  const switchToOnDevice = useCallback(() => {
    setMode('ondevice')
    setError(null)
    // Also guards against the same staleness above: switching modes with
    // existing source text left a stale online result on screen looking like
    // it had already been translated on-device, when nothing had run yet.
    setTranslated('')
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
    chunkProgress,
    modelDownloaded,
    deviceMemoryTier,
    showConfirm,
    copied,
    copy,
    share,
    runOnDevice,
    downloadModel,
    swap,
    setDirectionOnly,
    clearTranslation,
    clearSource,
    lastClearedSource: undoable.lastCleared,
    undoClearSource,
    switchToOnDevice,
    switchToOnline,
    requestOnDevice,
    confirmDownload,
    cancelConfirm,
  }
}

export type TranslateState = ReturnType<typeof useTranslateState>
