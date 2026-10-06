import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { convert, suggest } from '../lib/engine'
import type { Chip } from '../lib/engine/types'
import { confirm, tick } from '../lib/haptics'
import { getPref } from '../lib/prefs'
import { useUndoableClear } from './useUndoableClear'
import { shareText } from '../lib/share'
import { commitAt, insertAt, pendingAt, type Edit } from '../lib/caretCommit'

const TEXT_KEY = 'lekh:editor-text'

function getInitialText(): string {
  try {
    return localStorage.getItem(TEXT_KEY) ?? ''
  } catch {
    return ''
  }
}

function computePending(text: string): string {
  const m = text.match(/[A-Za-z0-9~*\\/^]+$/)
  return m ? m[0] : ''
}

// The end-of-text commit, for copy/share/export: whatever Latin run is left
// at the very end goes out as Devanagari. Typing itself commits at the caret
// (see caretCommit.ts).
function commitText(text: string): string {
  const p = computePending(text)
  if (!p) return text
  return text.slice(0, text.length - p.length) + convert(p)
}

// Enter is deliberately excluded — it should only insert a newline, never
// trigger a conversion (owner decision after the phone test).
function isTrigger(ch: string): boolean {
  return ch === ' ' || ch === '.' || ',?!;:'.includes(ch)
}

export function useEditorState(textareaRef?: RefObject<HTMLTextAreaElement | null>) {
  const [text, setText] = useState(getInitialText)
  /* Where the caret is, so a word can convert wherever it is typed rather
     than only at the end of the text. Starts at the end, which is where the
     field puts it on focus. */
  const [caret, setCaret] = useState(() => getInitialText().length)
  /* A caret position to restore once React has written a new value. Setting
     a controlled textarea's value from state moves the caret to the end, so
     every programmatic edit would otherwise throw someone typing in the
     middle of a paragraph to the bottom of it. */
  const caretAfterRender = useRef<number | null>(null)
  /* Read once, at mount, rather than subscribed: this is what the editor
     *starts* as, and having a settings change silently flip the mode under
     someone mid-sentence would be worse than making them tap EN/नेपाली. */
  const [nepali, setNepali] = useState(() => getPref('startNepali'))
  const [copied, setCopied] = useState(false)
  const [flashing, setFlashing] = useState(false)
  // Shared with Translate, which had no undo at all — see useUndoableClear.
  const undoable = useUndoableClear()

  useEffect(() => {
    try {
      localStorage.setItem(TEXT_KEY, text)
    } catch {
      // localStorage unavailable — text still works this visit, just won't survive a reload
    }
  }, [text])

  const pending = useMemo(
    () => (nepali ? pendingAt(text, Math.min(caret, text.length)) : ''),
    [text, caret, nepali],
  )

  /* One door for every edit that is not plain typing: write the text, then
     put the caret where the edit says it belongs. */
  const apply = useCallback((edit: Edit) => {
    caretAfterRender.current = edit.caret
    setCaret(edit.caret)
    setText(edit.text)
  }, [])

  useLayoutEffect(() => {
    const at = caretAfterRender.current
    const el = textareaRef?.current
    if (at === null || !el) return
    caretAfterRender.current = null
    if (document.activeElement === el) el.setSelectionRange(at, at)
  }, [text, textareaRef])

  const triggerFlash = useCallback(() => {
    setFlashing(true)
    setTimeout(() => setFlashing(false), 350)
  }, [])

  const chips = useMemo<Chip[]>(() => suggest(pending), [pending])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!nepali) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.currentTarget
      /* A selected range is being replaced, not typed after; let the browser
         do that the ordinary way. */
      if (el.selectionStart !== el.selectionEnd) return
      const at = el.selectionEnd
      const commitWith = (suffix: string) => {
        e.preventDefault()
        if (pendingAt(el.value, at)) triggerFlash()
        apply(commitAt(el.value, at, suffix))
      }
      if (e.key === ' ') commitWith(' ')
      else if (e.key === '.') commitWith('।')
      else if (',?!;:'.includes(e.key) && e.key.length === 1) commitWith(e.key)
      else if (e.key === 'Escape') {
        e.preventDefault()
        apply(insertAt(el.value, at, ' ')) // keep the English word as-is
      }
    },
    [nepali, triggerFlash, apply],
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
        setCaret(selectionEnd)
        setText(newValue)
        return
      }
      /* The character just typed is the one before the caret, wherever the
         caret is — not the last character of the text. */
      const grew = newValue.length >= text.length
      const typed = newValue.charAt(selectionEnd - 1)
      if (grew && selectionEnd > 0 && isTrigger(typed)) {
        const withoutTrigger = newValue.slice(0, selectionEnd - 1) + newValue.slice(selectionEnd)
        const at = selectionEnd - 1
        if (pendingAt(withoutTrigger, at)) triggerFlash()
        apply(commitAt(withoutTrigger, at, typed === '.' ? '।' : typed))
        return
      }
      setCaret(selectionEnd)
      setText(newValue)
    },
    [nepali, text, triggerFlash, apply],
  )

  /* Caret moves that change no text — a tap elsewhere in the paragraph, the
     arrow keys — still change which word is pending, and so which
     suggestions the strip offers. */
  const handleSelect = useCallback((selectionEnd: number) => {
    setCaret(selectionEnd)
  }, [])

  const chooseChip = useCallback(
    (chipText: string) => {
      triggerFlash()
      tick()
      apply(commitAt(text, Math.min(caret, text.length), ' ', chipText))
    },
    [triggerFlash, apply, text, caret],
  )

  const keepRaw = useCallback(() => {
    apply(insertAt(text, Math.min(caret, text.length), ' '))
  }, [apply, text, caret])

  const toggleMode = useCallback(() => setNepali((n) => !n), [])

  const clear = useCallback(() => {
    undoable.remember(text)
    setCaret(0)
    setText('')
  }, [text, undoable])

  const undoClear = useCallback(() => {
    const restored = undoable.undo()
    if (restored !== null) {
      setCaret(restored.length)
      setText(restored)
    }
  }, [undoable])

  // Appends typed-then-committed text — used by cheat-sheet tap-to-insert.
  // Deliberately end-of-text-only.
  const insertAtCursor = useCallback((ch: string) => {
    setText((t) => t + ch)
  }, [])

  /* The trailing Latin run is only *pending* while conversion is on. In EN
     mode it is the word the user is typing in English, and committing it
     here put Devanagari they had explicitly switched off onto the clipboard
     — `namaste` typed under EN came back as नमस्ते the moment copy was
     pressed. Both keydown paths already open with this same guard; these
     two were the only exports that skipped it. */
  const commitForExport = useCallback((): string => {
    if (!nepali) return text
    const committed = commitText(text)
    if (committed !== text) apply({ text: committed, caret: Math.min(caret, committed.length) })
    return committed
  }, [nepali, text, caret, apply])

  const copy = useCallback(async () => {
    const committed = commitForExport()
    if (!committed) return
    await navigator.clipboard.writeText(committed)
    /* The label already flips to "copied" — this is the same acknowledgement
       for a thumb that is covering the button it just pressed. */
    confirm()
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }, [commitForExport])

  const share = useCallback(async () => {
    const committed = commitForExport()
    if (!committed) return
    await shareText(committed)
  }, [commitForExport])

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
    handleSelect,
    chooseChip,
    keepRaw,
    toggleMode,
    clear,
    lastCleared: undoable.lastCleared,
    undoClear,
    copy,
    share,
    insertAtCursor,
  }
}

export type EditorState = ReturnType<typeof useEditorState>
