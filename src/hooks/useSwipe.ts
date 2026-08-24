import { useRef } from 'react'

// Shared by the Patro month grid and the app-wide tab switcher — both need
// the same "was this actually a deliberate horizontal swipe, not a vertical
// scroll or a tap" judgment, so the threshold and ratio live in one place.
const MIN_PX = 50
const RATIO = 1.5

/**
 * A single-finger horizontal swipe gesture. Returns touch handlers to spread
 * onto the element that should own the gesture; onSwipe fires with 1
 * (dragged leftward — "forward", the way a carousel advances) or -1
 * (dragged rightward — "back") once a touch ends past the threshold.
 * Multi-touch (pinch/zoom) cancels tracking rather than misreading one of
 * the fingers as a swipe.
 */
export function useSwipe(onSwipe: (direction: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    start.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) start.current = null
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const from = start.current
    start.current = null
    if (!from) return
    const touch = e.changedTouches[0]
    const dx = touch.clientX - from.x
    const dy = touch.clientY - from.y
    if (Math.abs(dx) > MIN_PX && Math.abs(dx) > Math.abs(dy) * RATIO) {
      onSwipe(dx < 0 ? 1 : -1)
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd }
}
