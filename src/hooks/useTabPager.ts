import { useEffect, useLayoutEffect, useRef, type TouchEvent as ReactTouchEvent } from 'react'
import type { Tab } from '../components/TabSwitcher'
import { TAB_ORDER } from './useAppNavigation'

/* How far a finger travels before the gesture commits to an axis. Below this
   nothing is decided, which is what lets a lazy diagonal still become a
   scroll rather than being claimed as a swipe on its first pixel. */
const AXIS_LOCK = 12
/* A swipe has to be meaningfully more sideways than it is up-and-down.
   Straight 1:1 would claim every diagonal scroll on a phone. */
const DOMINANCE = 1.4

/* Past this fraction of the screen, letting go finishes the move whatever the
   finger's speed. Under it, only a flick does. */
const COMMIT_FRACTION = 0.33
/* px/ms. A flick at this speed toward the neighbour commits from any
   distance — the Instagram feel is mostly this: a short fast swipe goes. */
const FLICK = 0.35
/* How much of the drag shows at either end, where there is no section to go
   to. Enough to say "this moved, there is nothing there", not enough to look
   like it might. */
const EDGE_RESIST = 0.22
const SETTLE_MS = 260
const EASE = 'cubic-bezier(0.22, 0.9, 0.3, 1)'

/* Does something under the finger have a better claim on a horizontal drag?
 *
 * Two kinds of thing do, and getting this wrong is how a swipe feature makes
 * an app worse rather than better:
 *
 * - A text field being typed in. While the keyboard is up the field is the
 *   whole interaction, and the editor is what this app is for.
 * - Anything that scrolls sideways. The suggestion strip does, and the cheat
 *   sheet grid can. These are found by *measuring* rather than by naming the
 *   classes, so the next horizontally-scrolling thing anyone adds does not
 *   silently start losing its gestures to the navigation.
 *
 * A textarea that is NOT being typed in does not, and that matters more than
 * it sounds. On a touch screen a one-finger sideways drag over a field neither
 * places the caret nor selects (that is a tap and a long-press), so there is
 * nothing to protect — while the Type editor and the Translate box are most of
 * their screens. Until 2.0.12 any textarea with text in it claimed the drag,
 * and the swipe went dead on both tabs the moment anything had been typed
 * (found in the 2.0.11 device sweep). Focused AND with the keyboard up is the
 * test: a field someone has tapped into and dismissed the keyboard from is
 * being read, not edited.
 *
 * Text inputs follow the same rule (2.0.14): at Larger text the phrasebook's
 * search box is a full-width band across the middle of Tools, and a swipe
 * started on it did nothing. Every other control — date, range, file, select,
 * contenteditable — keeps the gesture, because a sideways drag can mean
 * something to it.
 */
const TEXT_INPUTS = new Set(['text', 'search', 'email', 'url', 'tel', 'number', 'password'])
function ownsHorizontalDrag(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null
  if (!el) return false
  const field = el.closest('textarea, input, select, [contenteditable=""], [contenteditable="true"]')
  if (field) {
    const textLike =
      field instanceof HTMLTextAreaElement ||
      (field instanceof HTMLInputElement && TEXT_INPUTS.has(field.type))
    if (!textLike) return true
    const typing =
      document.activeElement === field &&
      document.documentElement.classList.contains('has-keyboard')
    if (typing) return true
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

interface TabPagerOptions {
  enabled: boolean
  tab: Tab
  /** Where the user left a section, so the peek can show it from there. */
  savedScroll: (tab: Tab) => number
  /** Register a one-shot callback for right after the next section swap;
      returns a function that withdraws it. */
  onceSwapped: (fn: () => void) => () => void
  onCommit: (tab: Tab) => void
}

interface Drag {
  /* The section the drag started on, read from the DOM at touchstart — not
     from React state, which can be a render behind straight after a swap. */
  from: Tab
  x: number
  y: number
  axis: 'none' | 'x' | 'y'
  page: HTMLElement | null
  cur: HTMLElement | null
  /* The section being pulled in, and which tab it is. Swapped if the finger
     turns round mid-drag. */
  peek: HTMLElement | null
  peekTab: Tab | null
  dx: number
  /* Two samples for the release velocity: a single last-move delta is noisy
     enough on a phone to turn a slow drag into a "flick". */
  vx: number
  lastX: number
  lastT: number
}

function sectionFor(page: HTMLElement, tab: Tab): HTMLElement | null {
  return page.querySelector<HTMLElement>(`:scope > .section[data-tab="${tab}"]`)
}

/* A release that is still animating. A new touch or a tab change from
   anywhere else must not wait for it: the touch finishes it at once (so a
   second quick swipe is not lost), and a tab change — a dock tap mid-settle —
   drops it, or the swipe would land afterwards and undo the tap. */
interface Settle {
  from: Tab
  to: Tab | null
  finishNow: () => void
  abort: () => void
}

function currentSection(page: HTMLElement): HTMLElement | null {
  return page.querySelector<HTMLElement>(':scope > .section:not(.section--idle)')
}

function clear(el: HTMLElement | null) {
  if (!el) return
  el.removeAttribute('data-peek')
  el.style.cssText = ''
}

/* Swipe sideways to change section, with the section under the finger.
 *
 * The first version detected a swipe and then played the dock's transition
 * once the finger had lifted, which is what a web page does with a gesture:
 * nothing moved while you moved, then something happened. In Instagram (and
 * every native pager) the screen is on the end of your finger the whole way —
 * the next section slides in beside the current one as you drag, a short fast
 * flick carries through, and a hesitant half-drag springs back. That is what
 * this does.
 *
 * How the neighbour is shown without disturbing anything: it is the same kept
 * Section, lifted out of flow as a fixed, overflow-hidden box the size of the
 * viewport, pushed down to where sections start and scrolled *inside itself*
 * to the offset the user left it at. That reproduces the in-flow picture
 * exactly — sticky headers included, since they now stick against that box
 * the way they stick against the document — so when the finger lifts and the
 * real swap happens (instantly, see useAppNavigation), the section the user
 * was looking at does not move by a pixel.
 *
 * Pushed down by a ::before spacer (--peek-top, App.css), NOT padding-top.
 * Chromium measures sticky offsets from inside the scroll container's padding,
 * so with padding Patro's month bar stuck a whole app-bar height too low and
 * sat in the middle of the grid during the swipe (2.0.9, owner's A024). Fixed inside .page is safe because
 * .page never takes a transform (App.css); only the outgoing section does, and
 * only for the length of the gesture.
 *
 * Touch events rather than pointer events, and that is not a style choice —
 * Chrome's compositor claims a pan before the main thread sees much of it and
 * fires pointercancel, so a horizontal drag arrived as a down and a cancel.
 * touch-action: pan-y would fix that but would also take horizontal scrolling
 * off the suggestion strip inside the page (touch-action intersects down the
 * tree). Touch events keep firing while the page scrolls, and nothing here
 * calls preventDefault, so vertical scrolling is untouched. A mouse drag is a
 * selection, and touch events simply do not fire for one.
 */
export function useTabPager({ enabled, tab, savedScroll, onceSwapped, onCommit }: TabPagerOptions) {
  const drag = useRef<Drag | null>(null)
  const settle = useRef<Settle | null>(null)
  const opts = useRef({ savedScroll, onceSwapped, onCommit })
  useEffect(() => {
    opts.current = { savedScroll, onceSwapped, onCommit }
  })

  /* The tab moved while a release was still animating, and not to where the
     release was going: someone tapped the dock (or pressed Back) mid-settle.
     Layout effect, so the half-slid sections are gone before that frame
     paints. */
  useLayoutEffect(() => {
    const s = settle.current
    if (s && tab !== s.from && tab !== s.to) s.abort()
  }, [tab])

  const neighbour = (from: Tab, dir: 1 | -1): Tab | null => {
    const i = TAB_ORDER.indexOf(from)
    if (i < 0) return null
    return TAB_ORDER[i + dir] ?? null
  }

  const lift = (d: Drag, peekTab: Tab) => {
    if (!d.page || !d.cur) return
    const el = sectionFor(d.page, peekTab)
    /* Not built yet (the idle pre-mount has not run): no peek, and the swipe
       still works — the current section moves alone and the swap lands. */
    if (!el) return
    const rect = d.cur.getBoundingClientRect()
    const top = rect.top + window.scrollY
    const bottom = parseFloat(getComputedStyle(d.page).paddingBottom) || 0
    el.setAttribute('data-peek', '')
    /* The full width of the screen, with the gutters as padding — not the
       section's own column. Type and Translate open on full-bleed surfaces
       that reach out into the gutters with negative margins, and a box only
       as wide as the column clipped them there, so a strip of page
       background showed between the two sections on every swipe (2.0.10,
       owner's A024: "a black bar in every swipe"). overflow clips at the
       padding edge, so the bleed now shows exactly as it does at rest. */
    const vw = document.documentElement.clientWidth
    el.style.cssText = [
      'display:block',
      'content-visibility:visible',
      'position:fixed',
      'top:0',
      'left:0',
      `width:${vw}px`,
      `padding-left:${rect.left}px`,
      `padding-right:${vw - rect.right}px`,
      `height:${window.innerHeight}px`,
      'overflow:hidden',
      'box-sizing:border-box',
      `--peek-top:${top}px`,
      `padding-bottom:${bottom}px`,
      'pointer-events:none',
      'will-change:transform',
    ].join(';')
    el.scrollTop = opts.current.savedScroll(peekTab)
    d.peek = el
    d.peekTab = peekTab
  }

  const paint = (d: Drag) => {
    const width = document.documentElement.clientWidth
    const dir: 1 | -1 = d.dx < 0 ? 1 : -1
    const wanted = neighbour(d.from, dir)
    if (wanted !== d.peekTab) {
      clear(d.peek)
      d.peek = null
      d.peekTab = null
      if (wanted) lift(d, wanted)
    }
    const x = d.peekTab ? d.dx : d.dx * EDGE_RESIST
    if (d.cur) d.cur.style.transform = `translate3d(${x}px,0,0)`
    if (d.peek) d.peek.style.transform = `translate3d(${x + dir * width}px,0,0)`
  }

  const reset = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    clear(d.peek)
    if (d.cur) d.cur.style.transform = ''
  }

  /* Lifted from the gesture: animate to where the finger was headed, then
     either swap sections (and clean up in the same task as the swap) or put
     everything back. */
  const release = (d: Drag) => {
    const width = document.documentElement.clientWidth
    const dir: 1 | -1 = d.dx < 0 ? 1 : -1
    const towards = Math.sign(d.vx) === -dir || Math.abs(d.vx) < 0.05
    const commit =
      d.peekTab !== null &&
      Math.abs(d.dx) > 6 &&
      ((Math.abs(d.dx) > width * COMMIT_FRACTION && towards) ||
        (Math.abs(d.vx) > FLICK && Math.sign(d.vx) === -dir))
    /* What is left to travel, at the speed the finger was going — so a fast
       flick finishes fast and a slow drag eases in — inside sane bounds. */
    const remaining = commit ? width - Math.abs(d.dx) : Math.abs(d.dx)
    const speed = Math.max(Math.abs(d.vx), 1)
    const ms = Math.round(Math.min(SETTLE_MS, Math.max(140, remaining / speed)))
    const target = commit ? -dir * width : 0
    const transition = `transform ${ms}ms ${EASE}`
    const { cur, peek, peekTab, from, page } = d
    if (cur) {
      cur.style.transition = transition
      cur.style.transform = `translate3d(${target}px,0,0)`
    }
    if (peek) {
      peek.style.transition = transition
      peek.style.transform = `translate3d(${target + dir * width}px,0,0)`
    }

    let done = false
    let withdraw: (() => void) | null = null
    const cleanup = () => {
      if (done) return
      done = true
      withdraw?.()
      clear(peek)
      if (cur) {
        cur.style.transition = ''
        cur.style.transform = ''
      }
      if (settle.current === me) settle.current = null
    }
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      /* Commit only if the screen is still the one the swipe left from —
         anything else means the tab already changed under it. */
      const still = page ? currentSection(page)?.dataset.tab === from : true
      if (commit && peekTab && still) {
        withdraw = opts.current.onceSwapped(cleanup)
        opts.current.onCommit(peekTab)
        /* Going home is a history.back() and lands on popstate; if that never
           comes, do not leave a section hanging off the side of the screen. */
        setTimeout(cleanup, 700)
      } else {
        cleanup()
      }
    }
    const me: Settle = {
      from,
      to: commit ? peekTab : null,
      finishNow: finish,
      abort: () => {
        finished = true
        cleanup()
      },
    }
    settle.current = me
    cur?.addEventListener('transitionend', finish, { once: true })
    setTimeout(finish, ms + 60)
  }

  /* A gesture that is still going when the pager is switched off (a sheet
     opened under the finger) is dropped where it is. */
  useEffect(() => {
    if (!enabled) reset()
  }, [enabled])

  const onTouchStart = (e: ReactTouchEvent<HTMLElement>) => {
    reset()
    if (!enabled) return
    /* A finger down while the last swipe is still settling: finish that one
       now rather than dropping this one, the way a native pager lets you
       catch it and keep going. Going home finishes on popstate, a moment
       later, and that one touch is let go. */
    settle.current?.finishNow()
    if (settle.current) return
    // A second finger means a pinch or a two-finger scroll, neither of which
    // is a request to change section.
    if (e.touches.length !== 1) return
    if (ownsHorizontalDrag(e.target)) return
    const cur = currentSection(e.currentTarget)
    const from = cur?.dataset.tab as Tab | undefined
    if (!cur || !from) return
    const touch = e.touches[0]
    drag.current = {
      from,
      x: touch.clientX,
      y: touch.clientY,
      axis: 'none',
      page: e.currentTarget,
      cur,
      peek: null,
      peekTab: null,
      dx: 0,
      vx: 0,
      lastX: touch.clientX,
      lastT: e.timeStamp,
    }
  }

  const onTouchMove = (e: ReactTouchEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    if (e.touches.length !== 1) {
      reset()
      return
    }
    const touch = e.touches[0]
    const dx = touch.clientX - d.x
    const dy = touch.clientY - d.y
    if (d.axis === 'none') {
      if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return
      d.axis = Math.abs(dx) > Math.abs(dy) * DOMINANCE ? 'x' : 'y'
      if (d.axis === 'y') {
        drag.current = null
        return
      }
      // Measured from here, so the section does not jump the 12px of slop.
      d.x = touch.clientX - Math.sign(dx)
    }
    const dt = e.timeStamp - d.lastT
    if (dt > 0) {
      const v = (touch.clientX - d.lastX) / dt
      d.vx = d.vx * 0.4 + v * 0.6
      d.lastX = touch.clientX
      d.lastT = e.timeStamp
    }
    d.dx = touch.clientX - d.x
    paint(d)
  }

  const onTouchEnd = (e: ReactTouchEvent<HTMLElement>) => {
    const d = drag.current
    drag.current = null
    if (!d || d.axis !== 'x') return
    /* A finger that stopped before lifting has no speed, whatever the last
       sample said. */
    if (e.timeStamp - d.lastT > 90) d.vx = 0
    release(d)
  }

  const onTouchCancel = () => {
    const d = drag.current
    drag.current = null
    if (d?.axis === 'x') {
      d.vx = 0
      d.dx = 0
      release(d)
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel }
}
