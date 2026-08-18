import { useRef, useState, type RefObject } from 'react'
import type { TranslateState } from './useTranslateState'
import { recognizeText, looksLikeWrongScript, type OcrLang } from '../lib/ocr/tesseract'

export type UploadInput =
  | { kind: 'image'; canvas: HTMLCanvasElement; name: string }
  | { kind: 'file'; file: File }

type ReadStatus = 'idle' | 'reading' | 'error'

const SUPPORTED_EXTS = ['txt', 'docx', 'pdf']
// OCR and pdf.js are the slow paths — typical phone-camera photos run 3-8MB,
// so 15MB comfortably excludes normal photos while catching genuinely large
// scans/multi-page PDFs that will visibly stall the progress bar.
const LARGE_FILE_BYTES = 15 * 1024 * 1024

export const FILE_ACCEPT = 'image/*,.pdf,.docx,.txt'

/**
 * Everything about turning a dropped/picked file (or camera-captured photo)
 * into source text — drag-and-drop, OCR/extraction, and the upload-specific
 * UI state (filename, progress, script-mismatch retry). Takes the shared
 * TranslateState so a successful read can land directly in `sourceText`,
 * the same field a typed translation uses — uploading is just another way
 * of filling in the Translate source pane, not a separate feature.
 *
 * fileInputRef is a parameter, not something this hook creates and returns —
 * a ref bundled into the returned object taints the whole object for
 * react-hooks/refs (it can no longer tell the plain state apart from the
 * ref), so the caller owns the ref and attaches it to the JSX directly, the
 * same way Editor.tsx receives textareaRef rather than useEditorState vending
 * one.
 */
export function useUploadState(t: TranslateState, fileInputRef: RefObject<HTMLInputElement | null>) {
  const [readStatus, setReadStatus] = useState<ReadStatus>('idle')
  const [readErrorIsOffline, setReadErrorIsOffline] = useState(false)
  const [readLabel, setReadLabel] = useState('Reading text…')
  const [readProgress, setReadProgress] = useState<number | null>(null)
  const [currentFile, setCurrentFile] = useState<string | null>(null)
  const [unsupportedExt, setUnsupportedExt] = useState<string | null>(null)
  const [largeFileWarning, setLargeFileWarning] = useState(false)
  // Set when an image's OCR result doesn't look like the expected source
  // script — see looksLikeWrongScript. Kept alongside the input that
  // produced it so "Switch & retry" can redo OCR against the same photo
  // instead of asking for a re-upload.
  const [scriptMismatch, setScriptMismatch] = useState<{ input: UploadInput; expected: OcrLang } | null>(
    null,
  )
  const [dragging, setDragging] = useState(false)

  // dragenter/dragleave fire for every child element the pointer crosses, so a
  // single boolean flickers as the cursor moves over the icon and the labels.
  // Counting enters minus leaves is the standard fix.
  const dragDepth = useRef(0)

  // langOverride exists for the mismatch-retry path: it calls t.setDirectionOnly()
  // and immediately re-runs handleInput, but React state updates aren't visible
  // synchronously — reading t.direction right after would still see the old
  // value. Passing the corrected language explicitly sidesteps that stale read.
  const handleInput = async (input: UploadInput, langOverride?: OcrLang) => {
    setReadStatus('reading')
    setReadProgress(0)
    setScriptMismatch(null)
    setUnsupportedExt(null)
    setCurrentFile(input.kind === 'image' ? input.name : input.file.name)
    setLargeFileWarning(input.kind === 'file' && input.file.size > LARGE_FILE_BYTES)
    // A stale translation of the *previous* upload would otherwise sit on
    // screen through the whole read — and in on-device mode, which only
    // (re)translates on an explicit button press, keep sitting there
    // afterward looking like it already covers the new photo.
    t.clearTranslation()
    const lang = langOverride ?? (t.direction === 'ne-en' ? 'nep' : 'eng')
    try {
      if (input.kind === 'image') {
        setReadLabel('Reading text…')
        const { text, confidence } = await recognizeText(input.canvas, lang, setReadProgress)
        if (looksLikeWrongScript(text, confidence, lang)) {
          setScriptMismatch({ input, expected: lang === 'nep' ? 'eng' : 'nep' })
          setReadStatus('idle')
          return
        }
        t.setSourceText(text)
      } else {
        const ext = input.file.name.split('.').pop()?.toLowerCase()
        if (!ext || !SUPPORTED_EXTS.includes(ext)) {
          setUnsupportedExt(ext ?? 'unknown')
          setReadStatus('idle')
          return
        }
        if (ext === 'txt') {
          setReadLabel('Reading file…')
          t.setSourceText(await input.file.text())
        } else if (ext === 'docx') {
          setReadLabel('Reading document…')
          const { extractDocxText } = await import('../lib/docs/docxInput')
          t.setSourceText(await extractDocxText(input.file))
        } else if (ext === 'pdf') {
          const { extractPdfText } = await import('../lib/docs/pdfInput')
          const text = await extractPdfText(input.file, lang, (p) => {
            setReadLabel(`Reading page ${p.page}/${p.totalPages}…`)
            setReadProgress(p.page / p.totalPages)
          })
          t.setSourceText(text)
        }
      }
      setReadStatus('idle')
    } catch {
      // The OCR engine and the pdf.js worker are deliberately not part of the
      // install-time precache (see vite.config.ts) — they're ~20MB, fetched
      // and cached on first actual use. A first scan/PDF attempt made before
      // that has ever succeeded once online has nothing to fall back to and
      // fails here, indistinguishable by error shape from a genuinely bad
      // photo — navigator.onLine is what tells them apart. Text/docx never
      // touch that lazy fetch (their code is part of the regular app bundle,
      // already precached), so this only applies to the two extensions that do.
      const usesLazyEngine = input.kind === 'image' || input.file.name.toLowerCase().endsWith('.pdf')
      setReadErrorIsOffline(usesLazyEngine && !navigator.onLine)
      setReadStatus('error')
    } finally {
      setReadProgress(null)
      setLargeFileWarning(false)
    }
  }

  const clearUpload = () => {
    setCurrentFile(null)
    setScriptMismatch(null)
    setUnsupportedExt(null)
    setReadStatus('idle')
    t.clearSource()
  }

  const retryWithCorrectDirection = () => {
    if (!scriptMismatch) return
    const { input, expected } = scriptMismatch
    t.setDirectionOnly(expected === 'nep' ? 'ne-en' : 'en-ne')
    setScriptMismatch(null)
    void handleInput(input, expected)
  }

  const acceptFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      void handleInput({ kind: 'file', file })
      return
    }
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        void handleInput({ kind: 'image', canvas, name: file.name })
      }
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  }

  const openFilePicker = () => fileInputRef.current?.click()

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    acceptFile(file)
  }

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }
  const onDragOver = (e: React.DragEvent) => e.preventDefault()
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current -= 1
    if (dragDepth.current <= 0) setDragging(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    acceptFile(e.dataTransfer.files?.[0])
  }

  return {
    readStatus,
    readErrorIsOffline,
    readLabel,
    readProgress,
    currentFile,
    unsupportedExt,
    largeFileWarning,
    scriptMismatch,
    dragging,
    clearUpload,
    retryWithCorrectDirection,
    openFilePicker,
    handleFileInputChange,
    onDragEnter,
    onDragOver,
    onDragLeave,
    onDrop,
  }
}

export type UploadState = ReturnType<typeof useUploadState>
