import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { convert, suggest } from '../lib/engine'
import type { Chip } from '../lib/engine/types'
import { confirm, tick } from '../lib/haptics'
import { getPref } from '../lib/prefs'
import { shareText } from '../lib/share'

const TEXT_KEY = 'lekh:editor-text'

function getInitialText(): string {
  try {
    return localStorage.getItem(TEXT_KEY) ?? ''
  } catch {
    return ''
  }
}

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

// Enter is deliberately excluded — it should only insert a newline, never
// trigger a conversion (owner decision after the phone test).
function isTrigger(ch: string): boolean {
  return ch === ' ' || ch === '.' || ',?!;:'.includes(ch)
}

export function useEditorState() {
  const [text, setText] = useState(getInitialText)
  /* Read once, at mount, rather than subscribed: this is what the editor
     *starts* as, and having a settings change silently flip the mode under
     someone mid-sentence would be worse than making them tap EN/नेपाली. */
  const [nepali, setNepali] = useState(() => getPref('startNepali'))
  const [copied, setCopied] = useState(false)
  const [flashing, setFlashing] = useState(false)
  const [lastCleared, setLastCleared] = useState<string | null>(null)
  const undoTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_KEY, text)
    } catch {
      // localStorage unavailable — text still works this visit, just won't survive a reload
    }
  }, [text])

  const pending = useMemo(() => (nepali ? computePending(text) : ''), [text, nepali])

  const triggerFlash = useCallback(() => {
    setFlashing(true)
    setTimeout(() => setFlashing(false), 350)
  }, [])

  const chips = useMemo<Chip[]>(() => suggest(pending), [pending])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!nepali) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === ' ') {
        e.preventDefault()
        if (pending) triggerFlash()
        setText((t) => commitText(t) + ' ')
      } else if (e.key === '.') {
        e.preventDefault()
        if (pending) triggerFlash()
        setText((t) => commitText(t) + '।')
      } else if (',?!;:'.includes(e.key) && e.key.length === 1) {
        e.preventDefault()
        if (pending) triggerFlash()
        setText((t) => commitText(t) + e.key)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setText((t) => t + ' ') // keep the English word as-is
      }
    },
    [nepali, pending, triggerFlash],
  )

  // Android IME keyboards (Gboard) fire keydown with key='Unidentified'
  // during composition, so handleKeyDown's trigger matching never fires
  // there — this is the only commit path that reaches phone users.
  // Desktop's handleKeyDown already preventDefault()s trigger keys, so this
  // never double-fires there; after a commit the trailing pending run is
  // empty, so a stray call here is a no-op anyway.
  const handleChange = useCallback(
    (newValue: string, selectionEnd: number) => {
      if (!nepali) {
        setText(newValue)
        return
      }
      const grew = newValue.length >= text.length
      const atEnd = selectionEnd === newValue.length
      const lastChar = newValue.slice(-1)
      if (grew && atEnd && isTrigger(lastChar)) {
        const body = newValue.slice(0, -1)
        const hadPending = computePending(body) !== ''
        if (hadPending) triggerFlash()
        const suffix = lastChar === '.' ? '।' : lastChar
        setText(commitText(body) + suffix)
        return
      }
      setText(newValue)
    },
    [nepali, text, triggerFlash],
  )

  const chooseChip = useCallback(
    (chipText: string) => {
      triggerFlash()
      tick()
      setText((t) => commitText(t, chipText) + ' ')
    },
    [triggerFlash],
  )

  const keepRaw = useCallback(() => {
    setText((t) => t + ' ')
  }, [])

  const toggleMode = useCallback(() => setNepali((n) => !n), [])

  // 6s undo window — long enough to notice and act, distinct from the
  // 1.6s/350ms copy/flash feedback timers above so it doesn't read as either.
  const clear = useCallback(() => {
    setText((t) => {
      setLastCleared(t)
      return ''
    })
    window.clearTimeout(undoTimeoutRef.current)
    undoTimeoutRef.current = window.setTimeout(() => setLastCleared(null), 6000)
  }, [])

  const undoClear = useCallback(() => {
    setLastCleared((cleared) => {
      if (cleared === null) return cleared
      setText(cleared)
      window.clearTimeout(undoTimeoutRef.current)
      return null
    })
  }, [])

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
    /* The label already flips to "copied" — this is the same acknowledgement
       for a thumb that is covering the button it just pressed. */
    confirm()
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }, [text])

  const share = useCallback(async () => {
    const committed = commitText(text)
    setText(committed)
    if (!committed) return
    await shareText(committed)
  }, [text])

  return {
    text,
    setText,
    nepali,
    pending,
    chips,
    copied,
    flashing,
    handleKeyDown,
    handleChange,
    chooseChip,
    keepRaw,
    toggleMode,
    clear,
    lastCleared,
    undoClear,
    copy,
    share,
    insertAtCursor,
    appendSample,
  }
}

export type EditorState = ReturnType<typeof useEditorState>
