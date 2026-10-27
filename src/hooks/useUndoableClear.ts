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
 * The offer is withdrawn the moment the box has text in it again. Before
 * 1.9.69 it stayed up for its full six seconds however much was typed
 * meanwhile, in the very spot Clear had been — so clearing, starting over and
 * then reaching for Clear again replaced the new text with the old. Only the
 * Preeti tool guarded against that, by hand; now the hook does it for all
 * three, adjusted during render rather than in an effect, since it only ever
 * follows the text.
 */

const WINDOW_MS = 6000

/** `current` is the box's text as it stands, which is what retires the offer. */
export function useUndoableClear(current: string) {
  const [lastCleared, setLastCleared] = useState<string | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)

  if (current !== '' && lastCleared !== null) setLastCleared(null)

  const remember = useCallback((text: string) => {
    /* Nothing to offer back. Clearing an empty box is not an action anyone
       needs undone, and offering it would replace the clear button with a
       dead one. */
    if (!text) return
    setLastCleared(text)
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setLastCleared(null), WINDOW_MS)
  }, [])

  /** Returns what was cleared, or null if the offer has gone. */
  const undo = useCallback((): string | null => {
    if (lastCleared === null) return null
    setLastCleared(null)
    window.clearTimeout(timeoutRef.current)
    return lastCleared
  }, [lastCleared])

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  return { lastCleared, remember, undo }
}
