import { useRef } from 'react'

// Small enough that a real vertical scroll never reads as a swipe attempt,
// large enough that the axis decision doesn't flip-flop on a shaky start.
const DEADZONE_PX = 8
// Fires the moment a horizontal drag crosses this, mid-gesture — not on
// release. Waiting for touchend (the first version of this hook did) meant
// nothing happened until the finger lifted, which reads as unresponsive
// compared to how a native swipe recognizer fires as soon as intent is
// clear. There is no live-tracking transform to hand off to on release
// either way, since the tab/month change this triggers plays its own
// from-scratch slide animation (see App.css's .page__pane keyframes).
const COMMIT_PX = 60

/**
 * A single-finger horizontal swipe gesture, recognized mid-drag rather than
 * on release. Returns touch handlers to spread onto the element that should
 * own the gesture; onSwipe fires once per gesture with 1 (dragged
 * leftward — "forward", the way a carousel advances) or -1 (dragged
 * rightward — "back"). The element should also carry `touch-action: pan-y`
 * in CSS so the browser doesn't compete with this for the same drag before
 * the axis lock below gets a chance to decide it's horizontal.
 */
export function useSwipe(onSwipe: (direction: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  // null = not yet decided, 'x'/'y' = locked once the drag clears the
  // deadzone on whichever axis moved further. Re-decided fresh each gesture.
  const axis = useRef<'x' | 'y' | null>(null)
  // Guards against onSwipe firing more than once per gesture — touchmove
  // keeps arriving for as long as the finger drags past COMMIT_PX.
  const fired = useRef(false)

  const reset = () => {
    start.current = null
    axis.current = null
    fired.current = false
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      reset()
      return
    }
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    axis.current = null
    fired.current = false
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      reset()
      return
    }
    const from = start.current
    if (!from || fired.current) return
    const touch = e.touches[0]
    const dx = touch.clientX - from.x
    const dy = touch.clientY - from.y
    if (axis.current === null) {
      if (Math.abs(dx) < DEADZONE_PX && Math.abs(dy) < DEADZONE_PX) return
      axis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (axis.current !== 'x') return
    if (Math.abs(dx) > COMMIT_PX) {
      fired.current = true
      onSwipe(dx < 0 ? 1 : -1)
    }
  }

  // Takes the event for signature parity with onTouchStart/onTouchMove at
  // call sites, even though ending a gesture never needs to read it.
  const onTouchEnd = (_e: React.TouchEvent) => reset()

  return { onTouchStart, onTouchMove, onTouchEnd }
}
