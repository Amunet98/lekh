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

/* Whether this engine can put an element in the top layer without a <dialog>.
 *
 * Read once, at module scope, because it is a property of the browser and
 * cannot change while the app is running. */
const CAN_POPOVER =
  typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function'

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const timeoutRef = useRef<number | undefined>(undefined)
  const nextId = useRef(0)
  const regionRef = useRef<HTMLDivElement>(null)

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

  /* Into the top layer while a message is up.
   *
   * z-index cannot win against a <dialog> opened with showModal(): the top
   * layer is above every z-index in the document, so a toast fired while
   * Settings, the cheat sheet or any bottom sheet was open rendered behind the
   * scrim. Confirmed by screenshot, not by reading the spec — the element was
   * in the DOM and simply nowhere on screen.
   *
   * It is not hypothetical. "Clear downloaded extras" lives *inside* Settings
   * and is the one destructive action in the app; it reports both success and
   * failure through this, so deleting ~900MB either confirmed itself to nobody
   * or failed silently. The same applies to anything the calendar or an export
   * reports while a sheet happens to be open.
   *
   * popover rather than a <dialog> of our own: a dialog would trap focus and
   * make the rest of the page inert, which is precisely wrong for a receipt
   * nobody is meant to interact with. `manual` so it never light-dismisses and
   * never closes the sheet underneath it.
   *
   * Feature-detected because the build targets safari14 and popover did not
   * land until 17. Without it this behaves exactly as it did before — correct
   * everywhere except over a dialog, which is where it already was.
   *
   * Known and accepted: within the top layer, paint order is order of entry,
   * so this wins only over dialogs opened *before* the toast. A toast already
   * on screen when a sheet opens is covered by it — verified, and the reason
   * the first attempt at this looked like it had not worked at all. That is
   * the harmless direction: the message was already being read when the user
   * chose to open something over it, and it clears itself in 3.2s either way.
   * The direction that mattered is a toast raised *from inside* an open sheet,
   * which is the one "Clear downloaded extras" actually takes. */
  useEffect(() => {
    const el = regionRef.current
    if (!CAN_POPOVER || !el) return
    /* :popover-open guards both calls: showPopover() on an open popover
       throws, and so does hidePopover() on a closed one. */
    if (toast && !el.matches(':popover-open')) el.showPopover()
    if (!toast && el.matches(':popover-open')) el.hidePopover()
  }, [toast])

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
      <div
        ref={regionRef}
        className="toast-region"
        /* Only when it can be honoured. The attribute alone makes an element
           display: none until it is shown, so setting it on an engine that
           cannot call showPopover() would hide every toast in the app. */
        {...(CAN_POPOVER ? { popover: 'manual' } : {})}
        role="status"
        aria-live="polite"
      >
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
