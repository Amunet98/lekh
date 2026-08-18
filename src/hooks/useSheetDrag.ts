import { useRef, useState, type RefObject } from 'react'

// Drag past 30% of the sheet's own height, or fling it fast enough even over
// a short distance, and it commits to closing rather than snapping back.
const DISMISS_HEIGHT_FRACTION = 0.3
const DISMISS_VELOCITY = 0.5 // px/ms
// Below this many px of vertical movement, a pointer session counts as a tap
// (closes via the click) rather than a drag (closes only past the thresholds
// above, decided once the pointer lifts).
const TAP_SLOP = 6

/**
 * Drag-to-dismiss for an edge-anchored bottom sheet — used by both
 * CheatSheetPanel and AboutSheet's mobile layout, which is why this lives
 * here rather than in either component: it's ~60 lines of stateful pointer
 * handling with one real bug already found and fixed in it (see below), and
 * duplicating that risk into a second file is worse than sharing it.
 *
 * dialogRef/panelRef are caller-owned refs, not created here — a ref bundled
 * into this hook's own returned object taints the whole object for
 * react-hooks/refs (it can no longer tell the plain state apart from the
 * ref), the same issue useUploadState hit with fileInputRef.
 */
export function useSheetDrag(
  dialogRef: RefObject<HTMLDialogElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  // dragY drives the sheet's live position with an inline style rather than a
  // class, since it changes on every pointermove; isDragging only toggles the
  // CSS transition on/off (off while a finger is actually moving it, so the
  // sheet tracks 1:1 with no lag — on for the snap-back/fling-closed glide
  // once the pointer lifts).
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ y: number; time: number } | null>(null)
  // Set right before the fling-closed animation starts; the transitionend
  // handler checks it to tell "just finished snapping back to 0" apart from
  // "just finished sliding the rest of the way off-screen, actually close."
  const pendingCloseRef = useRef(false)
  // setPointerCapture (below) keeps the grabber as the pointer/click target
  // for the whole gesture even once the finger has moved well past its
  // bounds — which means the browser's own click-after-pointerup fires on
  // this button after *every* drag, not just a tap. This is what tells
  // handleGrabberClick whether that click is a real tap (act on it) or the
  // tail end of a drag pointerup already decided (ignore it). Found the hard
  // way: without it, even a small under-threshold drag closed the sheet.
  const movedRef = useRef(false)

  const handleGrabberPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartRef.current = { y: e.clientY, time: performance.now() }
    movedRef.current = false
    setIsDragging(true)
  }

  const handleGrabberPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return
    const delta = e.clientY - dragStartRef.current.y
    if (Math.abs(delta) > TAP_SLOP) movedRef.current = true
    setDragY(Math.max(0, delta))
  }

  const handleGrabberPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current
    if (!start) return
    dragStartRef.current = null
    setIsDragging(false)
    if (!movedRef.current) {
      // A tap, not a drag — handleGrabberClick (fired right after this)
      // handles closing, so there's nothing to animate back from here.
      setDragY(0)
      return
    }
    const delta = Math.max(0, e.clientY - start.y)
    const elapsed = performance.now() - start.time
    const velocity = delta / Math.max(elapsed, 1)
    const height = panelRef.current?.getBoundingClientRect().height ?? 0
    if (delta > height * DISMISS_HEIGHT_FRACTION || velocity > DISMISS_VELOCITY) {
      pendingCloseRef.current = true
      setDragY(height)
    } else {
      setDragY(0)
    }
  }

  const handleGrabberClick = () => {
    // Real drags are already fully handled in handleGrabberPointerEnd —
    // acting on the click too would close the panel after *every* drag
    // regardless of distance, not just a tap.
    if (movedRef.current) return
    onClose()
  }

  const handlePanelTransitionEnd = (e: React.TransitionEvent<HTMLElement>) => {
    if (e.propertyName !== 'transform' || !pendingCloseRef.current) return
    pendingCloseRef.current = false
    dialogRef.current?.close()
  }

  // Call from the dialog's own onClose (fires for every dismissal route —
  // Escape, backdrop click, a plain tap, or a completed drag) so the next
  // open starts from a clean, undragged position.
  const reset = () => setDragY(0)

  return {
    dragY,
    isDragging,
    handleGrabberPointerDown,
    handleGrabberPointerMove,
    handleGrabberPointerEnd,
    handleGrabberClick,
    handlePanelTransitionEnd,
    reset,
  }
}
