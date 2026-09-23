import { useCallback, useEffect, useRef, useState } from 'react'
import { convert } from '../lib/engine/convert'
import { getPref, setPref } from '../lib/prefs'
import { useMediaQuery } from './useMediaQuery'

/* The first-run demonstration, and the whole of the app's onboarding.
 *
 * A new user cannot guess the one mechanic this app is built on — type Latin,
 * press space, get Devanagari — and everything else is already legible:
 * Translate looks like Google Translate, Patro looks like a calendar. So there
 * is no tour, no coach marks and nothing to dismiss. The editor types a word in
 * front of you, once, and that is the entire lesson.
 *
 * It drives the textarea's `placeholder`, and that choice does most of the work:
 *
 *  - Position, font, size and colour are exactly right by construction. An
 *    overlay would have to track the textarea's padding, the --ui-scale
 *    setting and the 480px breakpoint, and would drift from all three.
 *  - Yielding is free. A placeholder is gone the moment there is a character in
 *    the field, so the demonstration physically cannot sit on top of someone
 *    who has started writing — before any handler of ours runs.
 *  - Nothing is left behind. `text` stays empty, so no draft is persisted for
 *    the user to find and clear (getInitialText in useEditorState restores from
 *    localStorage, and writing there would have put a word nobody typed into
 *    their next launch).
 *  - Placeholder grey reads as a demonstration rather than as the user's text.
 *
 * Every setState below happens inside a timer callback. That is not a detail
 * dodged around the lint rule, it is what this hook is: a subscription to a
 * short external timeline, which is the shape effects are actually for.
 */

/* Asking for it again.
 *
 * The demonstration is one-shot by design and that is right — it plays and
 * sets seenIntro for good, so it can never read as a bug that repeats. What
 * was wrong is that it was also unrecoverable: the one explanation the app
 * offers lasted about three seconds, and someone who looked away during it, or
 * handed the phone to the person they installed it for, had no way back to it
 * short of clearing the app's storage.
 *
 * Clearing seenIntro alone would not have replayed it either, and that is why
 * this exists rather than a setPref call in the Settings row. `eligible` is a
 * snapshot taken when the hook mounts (see below for why it has to be), and
 * the Type section is keep-alive — it mounts once per launch and stays — so a
 * pref written afterwards would be read by nobody until the next cold start.
 *
 * A module-level signal instead: Settings calls replayIntro(), the live hook
 * hears it, and the demonstration runs in the editor the user is about to be
 * looking at. */
const replayListeners = new Set<() => void>()

/** Play the first-run demonstration again, now. */
export function replayIntro() {
  replayListeners.forEach((fn) => fn())
}

function subscribeReplay(fn: () => void): () => void {
  replayListeners.add(fn)
  return () => replayListeners.delete(fn)
}

/* The word the app already leads with everywhere: SAMPLES[0], the editor's own
   placeholder example, and the boot screen's first beat. Run through convert()
   rather than hardcoded, so this can never claim the engine does something it
   does not — it resolves through dict/greetings.ts to नमस्ते. */
const WORD = 'namaste'

const START_DELAY_MS = 320
const PER_CHAR_MS = 110
/* Long enough to read the Latin word as finished before it changes. Below
   ~350ms the flip reads as a glitch in the typing rather than as its result. */
const BEFORE_FLIP_MS = 450
const AFTER_FLIP_MS = 1150
/* Matches --dur-slow, which is how long .editor--flash runs. */
const FLASH_MS = 420
/* Reduced motion: no character walk, just the same opening beat and then the
   answer, held long enough to read. The animation was never the lesson. */
const REDUCED_HOLD_MS = 1600

export interface IntroDemo {
  /** The placeholder to show right now, or null to use the editor's own. */
  text: string | null
  /** True for the whole run, so the empty-state watermark can stay out of the way. */
  active: boolean
  /** Fires once, at the flip, to borrow .editor--flash. */
  flashing: boolean
  /** Ends it immediately and for good. Safe to call any number of times. */
  stop: () => void
}

/**
 * @param ready The splash has left. Boot is once-per-session, so on a
 *   genuinely fresh install it *will* be up, and starting behind it would spend
 *   the one showing this ever gets on frames nobody sees. Passed in rather than
 *   timed against BootScreen's own constants, which are allowed to change.
 * @param emptyAtMount Whether the editor had no restored draft when this
 *   mounted. A *snapshot*, not a live reading, and that is the point: as a live
 *   `isEmpty` it merely deferred the demo for anyone with a draft, so the first
 *   time they pressed clear the app would start typing at them — a word
 *   appearing by itself in the field they had just emptied on purpose. Missing
 *   the showing entirely is the better failure.
 */
export function useIntroDemo(ready: boolean, emptyAtMount: boolean): IntroDemo {
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  /* Both halves read once, at mount, and never again. The flag because the
     effect below writes it as soon as it starts and a live read would turn that
     into an instant stop — getPref rather than usePref for exactly that reason,
     this must not be reactive. Emptiness because of the clear-button case in
     the doc comment above. */
  const [eligibleAtMount] = useState(() => emptyAtMount && !getPref('seenIntro'))
  /* Bumped by a replay request. It is a counter rather than a flag so that
     asking twice runs it twice — the effect below keys off it, and a boolean
     that is already true is not a change. */
  const [replays, setReplays] = useState(0)
  const eligible = eligibleAtMount || replays > 0

  const [text, setText] = useState<string | null>(null)
  const [flashing, setFlashing] = useState(false)
  const [finished, setFinished] = useState(false)
  /* The same fact as `finished`, readable synchronously inside the effect. The
     effect re-runs if the reduced-motion preference changes mid-demo, and
     state read there would be the value from the render that scheduled it. */
  const finishedRef = useRef(false)

  const stop = useCallback(() => {
    finishedRef.current = true
    setFinished(true)
    setText(null)
    setFlashing(false)
  }, [])

  /* Both latches have to come down, and in the same callback: `finished` is
     what makes `active` false, and finishedRef is what the effect checks on
     the way in. Leaving either set would let the timers run against a
     placeholder nobody ever sees. */
  useEffect(
    () =>
      subscribeReplay(() => {
        finishedRef.current = false
        setFinished(false)
        setReplays((n) => n + 1)
      }),
    [],
  )

  useEffect(() => {
    if (!eligible || !ready || finishedRef.current) return

    /* Set on start, not on completion, and the asymmetry is deliberate: a
       demonstration that plays twice reads as a bug, while one that is missed
       costs nothing — the starter chips and the keyboard legend are on the same
       empty screen saying the same thing in words. So a force-quit mid-demo
       spends the showing. That is the cheaper mistake. */
    setPref('seenIntro', true)

    const timers: ReturnType<typeof setTimeout>[] = []
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms))

    if (reduced) {
      at(START_DELAY_MS, () => setText(convert(WORD)))
      at(START_DELAY_MS + REDUCED_HOLD_MS, stop)
    } else {
      let t = START_DELAY_MS
      for (let i = 1; i <= WORD.length; i++) {
        const slice = WORD.slice(0, i)
        at(t, () => setText(slice))
        t += PER_CHAR_MS
      }
      t += BEFORE_FLIP_MS
      at(t, () => {
        setText(convert(WORD))
        setFlashing(true)
      })
      at(t + FLASH_MS, () => setFlashing(false))
      at(t + AFTER_FLIP_MS, stop)
    }

    return () => timers.forEach(clearTimeout)
  }, [eligible, ready, reduced, stop, replays])

  /* Derived, not stored. `active` is true from the moment the screen is ready —
     including the opening beat before the first character, which is when the
     watermark most needs to be out of the way — and false again the moment
     stop() runs. As state it would have meant a setState in the effect body for
     no gain. */
  const active = eligible && ready && !finished
  /* `?? ''` and not `?? null`, which is the difference between the word typing
     itself from an empty field and it jump-cutting out of the editor's own
     hint. Null falls through to PLACEHOLDER in Editor.tsx, so during the
     opening beat — before the first character is scheduled — the full
     "namaste — start typing…" sentence was still on screen, and then replaced
     wholesale by "n". Measured at t=1800ms on a fresh profile. An empty string
     is not null, so it wins the ?? in Editor and the field starts blank. */
  return { text: active ? (text ?? '') : null, active, flashing, stop }
}
