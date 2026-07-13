import { useCallback, useMemo, useState } from 'react'
import { convert, DICT } from '../lib/engine'
import type { Chip } from '../lib/engine/types'

function computePending(text: string): string {
  const m = text.match(/[A-Za-z0-9~]+$/)
  return m ? m[0] : ''
}

// Not caret-aware — always operates on the trailing run of Latin
// characters, same limitation as the prototype (see project notes).
function commitText(text: string, replacement?: string): string {
  const p = computePending(text)
  if (!p) return text
  const conv = replacement !== undefined ? replacement : convert(p)
  return text.slice(0, text.length - p.length) + conv
}

export function useEditorState() {
  const [text, setText] = useState('')
  const [nepali, setNepali] = useState(true)
  const [copied, setCopied] = useState(false)

  const pending = useMemo(() => (nepali ? computePending(text) : ''), [text, nepali])

  const chips = useMemo<Chip[]>(() => {
    if (!pending) return []
    const seen = new Set<string>()
    const result: Chip[] = []
    const primary = convert(pending)
    result.push({ text: primary, primary: true })
    seen.add(primary)
    const lower = pending.toLowerCase()
    for (const key of Object.keys(DICT)) {
      if (result.length >= 5) break
      if (key.startsWith(lower) && !seen.has(DICT[key])) {
        result.push({ text: DICT[key], primary: false })
        seen.add(DICT[key])
      }
    }
    return result
  }, [pending])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!nepali) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ') {
        e.preventDefault()
        setText((t) => commitText(t) + ' ')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        setText((t) => commitText(t) + '\n')
      } else if (e.key === '.') {
        e.preventDefault()
        setText((t) => commitText(t) + '।')
      } else if (',?!;:'.includes(e.key) && e.key.length === 1) {
        e.preventDefault()
        setText((t) => commitText(t) + e.key)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setText((t) => t + ' ') // keep the English word as-is
      }
    },
    [nepali],
  )

  const chooseChip = useCallback((chipText: string) => {
    setText((t) => commitText(t, chipText) + ' ')
  }, [])

  const keepRaw = useCallback(() => {
    setText((t) => t + ' ')
  }, [])

  const toggleMode = useCallback(() => setNepali((n) => !n), [])

  const clear = useCallback(() => setText(''), [])

  // Appends typed-then-committed text — used by cheat-sheet tap-to-insert
  // and the sample-phrase buttons. Deliberately end-of-text-only.
  const insertAtCursor = useCallback((ch: string) => {
    setText((t) => t + ch)
  }, [])

  const appendSample = useCallback((words: string) => {
    const converted = words
      .trim()
      .split(/\s+/)
      .map(convert)
      .join(' ')
    setText((t) => {
      const sep = t && !/\s$/.test(t) ? ' ' : ''
      return t + sep + converted + ' '
    })
  }, [])

  const copy = useCallback(async () => {
    const committed = commitText(text)
    setText(committed)
    if (!committed) return
    await navigator.clipboard.writeText(committed)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }, [text])

  return {
    text,
    setText,
    nepali,
    pending,
    chips,
    copied,
    handleKeyDown,
    chooseChip,
    keepRaw,
    toggleMode,
    clear,
    copy,
    insertAtCursor,
    appendSample,
  }
}

export type EditorState = ReturnType<typeof useEditorState>
