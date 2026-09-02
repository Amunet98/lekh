import { useCallback, useEffect, useRef, useState } from 'react'

/* Clearing, with a way back.
 *
 * The Type tab has had this since it shipped and Translate never did: the
 * same button, in the same place, doing the same irreversible thing, except
 * on one screen it could be taken back and on the other it could not. A
 * six-second window is long enough to notice and act, and deliberately
 * distinct from the 1.6s copy flash and the 350ms conversion flash so it
 * doesn't read as either of them.
 *
 * The value is held in a ref as well as in state: state is what re-renders
 * the button into "undo clear", and the ref is what undo() can read
 * synchronously without a setState-inside-a-setState.
 */

const WINDOW_MS = 6000

export function useUndoableClear() {
  const [lastCleared, setLastCleared] = useState<string | null>(null)
  const valueRef = useRef<string | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)

  const remember = useCallback((text: string) => {
    /* Nothing to offer back. Clearing an empty box is not an action anyone
       needs undone, and offering it would replace the clear button with a
       dead one. */
    if (!text) return
    valueRef.current = text
    setLastCleared(text)
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => {
      valueRef.current = null
      setLastCleared(null)
    }, WINDOW_MS)
  }, [])

  /** Returns what was cleared, or null if the window has closed. */
  const undo = useCallback((): string | null => {
    const value = valueRef.current
    if (value === null) return null
    valueRef.current = null
    setLastCleared(null)
    window.clearTimeout(timeoutRef.current)
    return value
  }, [])

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  return { lastCleared, remember, undo }
}
