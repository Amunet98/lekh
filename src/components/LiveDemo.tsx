import { useEffect, useRef, useState } from 'react'
import { convert } from '../lib/engine/convert'
import { useMediaQuery } from '../hooks/useMediaQuery'

/* The empty Type screen's lesson, playing itself.
 *
 * "mero naam" is typed a letter at a time in a small field, each word turns
 * into Devanagari as the space after it is pressed, the result holds, and it
 * starts again. It replaced a three-step list (1.9.71) at the owner's choice
 * between three options (2026-10-28): a list has to be read and imagined, and
 * this is the mechanic itself, which is the one thing about the app a new user
 * cannot guess.
 *
 * Built from convert(), the same engine the editor runs, so the demonstration
 * can never show a spelling the app would not produce.
 *
 * Calm by construction:
 *  - It runs only while it is on screen. An IntersectionObserver stops the
 *    clock when the section is hidden (content-visibility leaves it no box),
 *    when the keyboard takes the empty state away, and the page-visibility
 *    check stops it when the phone locks. It unmounts with the first
 *    character typed.
 *  - With reduced motion it shows the finished line and never moves.
 *  - Screen readers get one sentence, not a stream of letters (the moving
 *    field is aria-hidden). */

const WORDS = ['mero', 'naam']
const TYPE_MS = 170
const CONVERT_MS = 420
const HOLD_MS = 2200
const GAP_MS = 500

interface Frame {
  done: string
  pending: string
  ms: number
}

/* The whole loop as a list of what is on screen and for how long. */
function buildFrames(): Frame[] {
  const frames: Frame[] = [{ done: '', pending: '', ms: GAP_MS }]
  let done = ''
  for (const word of WORDS) {
    for (let i = 1; i <= word.length; i++) {
      frames.push({ done, pending: word.slice(0, i), ms: TYPE_MS })
    }
    // The space: the pending word becomes Devanagari.
    done = done ? `${done} ${convert(word)}` : convert(word)
    frames.push({ done, pending: '', ms: CONVERT_MS })
  }
  frames[frames.length - 1].ms = HOLD_MS
  return frames
}

const FRAMES = buildFrames()
const FINAL = FRAMES[FRAMES.length - 1]

export function LiveDemo() {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      // No observer: run, as the field is only mounted while the screen is empty.
      const id = window.setTimeout(() => setVisible(true), 0)
      return () => window.clearTimeout(id)
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (reduced || !visible) return
    let timer = 0
    const schedule = (i: number) => {
      timer = window.setTimeout(() => {
        if (document.hidden) {
          schedule(i)
          return
        }
        const next = (i + 1) % FRAMES.length
        setIndex(next)
        schedule(next)
      }, FRAMES[i].ms)
    }
    schedule(index)
    return () => window.clearTimeout(timer)
    // index is the starting point when the clock (re)starts, not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, visible])

  const frame = reduced ? FINAL : FRAMES[index]

  return (
    <div className="live-demo" ref={ref}>
      <p className="sr-only">
        For example, type mero naam and press space to get{' '}
        <span lang="ne">{FINAL.done}</span>, then paste it into any app.
      </p>
      <div className="live-demo__field" aria-hidden="true">
        {frame.done && (
          <span className="live-demo__done dev" lang="ne">
            {frame.done}
            {frame.pending && ' '}
          </span>
        )}
        {frame.pending && <span className="live-demo__pending">{frame.pending}</span>}
        <span className={`live-demo__caret${reduced ? ' live-demo__caret--still' : ''}`} />
      </div>
      <p className="live-demo__caption" aria-hidden="true">
        Type <kbd>mero naam</kbd>, press <kbd>space</kbd>
        <span className="live-demo__then">— then paste it into any app</span>
      </p>
    </div>
  )
}
