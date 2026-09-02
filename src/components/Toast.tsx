import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ToastApi } from '../hooks/useToast'
import { confirm as hapticConfirm, warn as hapticWarn } from '../lib/haptics'
import './Toast.css'

/* Somewhere for the app to say "done" — and, more importantly, "that didn't
 * work".
 *
 * The only toast in the app was the service worker's update offer. Everything
 * else either had anchored feedback (the copy button flashes "copied", which
 * is better than a toast and stays) or had nothing at all: a failed
 * translation, a share the system refused, an export written to disk. Actions
 * that end somewhere other than where you tapped need to report back, or the
 * app looks like it ignored you.
 *
 * One live region, not one per toast: screen readers announce changes to a
 * region, and mounting a fresh aria-live element per message is the classic
 * way to have half of them never announced at all.
 *
 * This is for transient acknowledgement only. UpdatePrompt keeps its own
 * component and stays put until answered — it is an offer, not a receipt.
 */

type ToastKind = 'done' | 'problem'

interface ToastMessage {
  id: number
  text: string
  kind: ToastKind
}

const DURATION = 3200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)
  const nextId = useRef(0)

  /* One at a time. A queue was the alternative and it is the wrong shape for
     this app: these are acknowledgements of things the user just did, one
     gesture at a time, and a backlog of them would still be draining after
     the moment they referred to has passed. A second message replaces the
     first, which is also what makes the timer trivially correct. */
  const show = useCallback((text: string, kind: ToastKind) => {
    setToast({ id: nextId.current++, text, kind })
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setToast(null), DURATION)
    if (kind === 'done') hapticConfirm()
    else hapticWarn()
  }, [])

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const api = useMemo<ToastApi>(
    () => ({
      done: (text: string) => show(text, 'done'),
      problem: (text: string) => show(text, 'problem'),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Always mounted, empty most of the time — see the note above on why
          the region cannot come and go with the message. role="status" is
          polite by definition, so a confirmation never interrupts someone
          mid-sentence in the editor. */}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div
            key={toast.id}
            className={`toast toast--${toast.kind}`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
