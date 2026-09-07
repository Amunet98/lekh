import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

/* How far a finger travels before the gesture commits to an axis. Below this
   nothing is decided, which is what lets a lazy diagonal still become a
   scroll rather than being claimed as a swipe on its first pixel. */
const AXIS_LOCK = 12
/* And how far along that axis before it counts as a swipe rather than a
   wobble. Deliberately larger than AXIS_LOCK: deciding *which* way a gesture
   is going is a cheaper question than deciding it meant to leave the screen. */
const COMMIT = 64
/* A swipe has to be meaningfully more sideways than it is up-and-down.
   Straight 1:1 would claim every diagonal scroll on a phone. */
const DOMINANCE = 1.4

/* Does something under the finger have a better claim on a horizontal drag?
 *
 * Two kinds of thing do, and getting this wrong is how a swipe feature makes
 * an app worse rather than better:
 *
 * - A text field. Dragging in one places the caret and selects — that is the
 *   whole interaction, and the editor is what this app is for.
 * - Anything that scrolls sideways. The suggestion strip does, and the cheat
 *   sheet grid can. These are found by *measuring* rather than by naming the
 *   classes, so the next horizontally-scrolling thing anyone adds does not
 *   silently start losing its gestures to the navigation.
 */
function ownsHorizontalDrag(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null
  if (!el) return false
  if (el.closest('textarea, input, select, [contenteditable=""], [contenteditable="true"]')) {
    return true
  }
  for (let node: Element | null = el; node; node = node.parentElement) {
    // +1 for sub-pixel layout: a box can measure a fraction wider than itself
    // and is not actually scrollable.
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflowX = getComputedStyle(node).overflowX
      if (overflowX === 'auto' || overflowX === 'scroll') return true
    }
  }
  return false
}

interface TabSwipeOptions {
  enabled: boolean
  onPrev: () => void
  onNext: () => void
}

/* Swipe sideways to change section.
 *
 * A bottom nav you can only tap is a web bottom nav — it was the last thing
 * in the app that could only be operated the way a page is operated. The
 * animation this triggers is not new: tapping the dock already runs a
 * direction-aware view transition (see setDirection in useAppNavigation and
 * the ::view-transition rules in App.css), and this just gives it a second
 * way in.
 *
 * The content deliberately does NOT track the finger. Two reasons, and the
 * first is a hard one: a view transition cannot be driven interactively, so
 * tracking would mean hand-animating a transform and then handing over to a
 * different animation on release — two systems for one movement. The second
 * is that App.css spells out that .page must never take a transform, because
 * it would re-anchor any fixed descendant to .page instead of the viewport.
 * Detect, then let the existing transition play.
 *
 * Touch only, by pointerType rather than by a media query. A mouse drag
 * across a page is a selection, and no width tells you whether the pointer
 * doing the dragging is a finger.
 */
export function useTabSwipe({ enabled, onPrev, onNext }: TabSwipeOptions) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const axis = useRef<'none' | 'x' | 'y'>('none')

  const reset = () => {
    start.current = null
    axis.current = 'none'
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    reset()
    if (!enabled || e.pointerType !== 'touch') return
    if (ownsHorizontalDrag(e.target)) return
    start.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const from = start.current
    if (!from) return
    const dx = e.clientX - from.x
    const dy = e.clientY - from.y
    if (axis.current !== 'none') return
    if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return
    axis.current = Math.abs(dx) > Math.abs(dy) * DOMINANCE ? 'x' : 'y'
  }

  const onPointerUp = (e: ReactPointerEvent) => {
    const from = start.current
    const decided = axis.current
    reset()
    if (!from || decided !== 'x') return
    const dx = e.clientX - from.x
    if (Math.abs(dx) < COMMIT) return
    // Dragging leftward pulls the next section in from the right, which is the
    // direction the dock reads in and the direction the transition animates.
    if (dx < 0) onNext()
    else onPrev()
  }

  /* Fired when the browser takes the gesture over — which on a phone means
     the page has started scrolling vertically. That is the single most common
     way this gesture ends, and it must end as a no-op. */
  const onPointerCancel = reset

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
