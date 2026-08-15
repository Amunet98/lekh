import { useEffect, useRef, useState } from 'react'
import { LekhMark } from './LekhMark'
import './BootScreen.css'

interface BootScreenProps {
  /** Called once the exit transition has finished and the overlay can unmount. */
  onDone: () => void
}

/* Long enough that the wordmark animation reads as intentional, short enough
   that it never becomes a toll on a returning user. Anything under ~800ms
   looks like a flash of unstyled content rather than a boot. */
const MIN_HOLD_MS = 1100
const MIN_HOLD_REDUCED_MS = 400
/* Must stay in step with --dur-slow / the .boot--exiting transition in
   BootScreen.css. If they drift, the overlay either unmounts mid-fade (a
   visible pop) or lingers as a dead layer over a live app. */
const EXIT_MS = 420

/* Three beats, not a progress log. The first is a greeting in the script the
   app exists to produce; the last confirms. The middle one is the only
   literal status, and it is true — the transliteration maps and dictionary
   are what the bundle is parsing while this is on screen. */
const STATUS_STEPS: { at: number; text: string; dev?: boolean }[] = [
  { at: 0, text: 'नमस्ते', dev: true },
  { at: 0.34, text: 'loading script maps…' },
  { at: 1, text: 'ready' },
]

function prefersReducedMotion(): boolean {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function BootScreen({ onDone }: BootScreenProps) {
  const [exiting, setExiting] = useState(false)
  const [step, setStep] = useState(0)
  const fillRef = useRef<HTMLDivElement>(null)
  /* Guards every async path below. Without it, StrictMode's double-mount in
     dev leaves a second rAF loop and a second exit timer running against an
     unmounted tree. */
  const liveRef = useRef(true)

  useEffect(() => {
    liveRef.current = true
    const reduced = prefersReducedMotion()
    const hold = reduced ? MIN_HOLD_REDUCED_MS : MIN_HOLD_MS
    const started = performance.now()

    let raf = 0
    let exitTimer: ReturnType<typeof setTimeout> | undefined
    /* Flips true when the fonts have landed. Until then the bar is capped
       below 100 — a progress bar that sits full while the screen is still up
       is worse than one that crawls. */
    let ready = false

    const beginExit = () => {
      if (!liveRef.current || exitTimer) return
      /* First, before anything writes 100%. The tick loop recomputes the bar
         from elapsed time, so leaving it running meant the very next frame
         overwrote the 100% below with whatever the clock said and dragged the
         bar visibly backwards for the whole 420ms fade — most obvious on a
         skip, which is exactly when the bar is furthest from full. */
      cancelAnimationFrame(raf)
      setExiting(true)
      setStep(STATUS_STEPS.length - 1)
      if (fillRef.current) fillRef.current.style.transform = 'scaleX(1)'
      exitTimer = setTimeout(() => {
        if (liveRef.current) onDone()
      }, reduced ? 0 : EXIT_MS)
    }

    /* The real reason the splash exists. Anek Devanagari and Noto Sans
       Devanagari are fetched from Google Fonts, so the wordmark used to
       render in a fallback face and then visibly re-shape a beat later.
       Gating the dismiss on document.fonts means that reflow happens behind
       the overlay instead of in front of the user. */
    const fontsReady =
      'fonts' in document
        ? document.fonts.ready.then(() => undefined)
        : Promise.resolve()
    /* …but never wait on it forever. A blocked or offline font request must
       not strand anyone on a splash screen. */
    void Promise.race([
      fontsReady,
      new Promise<void>((resolve) => setTimeout(resolve, 2500)),
    ]).then(() => {
      ready = true
      maybeExit()
    })

    /* Two independent gates — the minimum hold and the fonts — and the exit
       fires when both are met, driven by timers.
     *
     * The first version drove the dismissal from the rAF loop below, which
     * does not tick in a background tab. Load the app hidden (a restored tab,
     * or Android bringing a PWA up behind something) and the splash froze at
     * 0% and stayed there until the tab was focused — the whole app parked
     * behind an overlay because a *progress bar* had stopped animating.
     *
     * Timers still fire when hidden, throttled to about a second, which is
     * fine for a single 1100ms deadline. rAF is now only what paints the bar;
     * nothing depends on it to make progress. */
    let holdDone = false
    const maybeExit = () => {
      if (holdDone && ready) beginExit()
    }
    const holdTimer = setTimeout(() => {
      holdDone = true
      maybeExit()
    }, hold)

    const tick = () => {
      if (!liveRef.current) return
      const elapsed = performance.now() - started
      /* Cap at 0.92 until the fonts resolve, then let the last 8% close. The
         bar is therefore always truthful: it only fills when the app really
         is ready to show. */
      const raw = elapsed / hold
      const progress = ready ? Math.min(raw, 1) : Math.min(raw, 0.92)

      if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress.toFixed(3)})`

      const nextStep = STATUS_STEPS.reduce((acc, s, i) => (progress >= s.at ? i : acc), 0)
      setStep((prev) => (prev === nextStep ? prev : nextStep))

      if (progress >= 1 && ready) return
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    /* Skip. Someone who reloads twice in a row should never see the full
       hold — the first touch, click, or keystroke takes them straight in. */
    const skip = () => beginExit()
    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)

    return () => {
      liveRef.current = false
      cancelAnimationFrame(raf)
      clearTimeout(holdTimer)
      if (exitTimer) clearTimeout(exitTimer)
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }
  }, [onDone])

  const status = STATUS_STEPS[step]

  return (
    <div
      className={`boot${exiting ? ' boot--exiting' : ''}`}
      role="status"
      aria-busy={!exiting}
      aria-label="Lekh Patro is starting"
    >
      <div className="boot__stage">
        {/* One animated unit — see LekhMark for why the two halves cannot be
            animated separately. */}
        <h1 className="boot__mark" aria-hidden="true">
          <LekhMark inkClassName="boot__ink" />
        </h1>

        <svg className="boot__swash" viewBox="0 0 300 14" fill="none" aria-hidden="true">
          <path
            d="M4 9 C 80 2, 220 2, 296 8"
            stroke="var(--accent)"
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity=".75"
          />
          <path
            d="M40 12 C 120 7, 200 7, 262 11"
            stroke="var(--accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity=".28"
          />
        </svg>

        <p className="boot__latin" aria-hidden="true">
          lekh patro
        </p>

        {/* A hairline, and no percentage beside it. The readout was precise
            about something nobody needs to a percent — the bar already says
            how far along this is, and the number was one more thing on a
            screen that is up for about a second. */}
        <div className="boot__track">
          <div className="boot__fill" ref={fillRef} />
        </div>

        {/* polite, not assertive: this is progress chatter, and it must not
            interrupt anything a screen-reader user is already hearing. It is
            also the only status this screen still announces, now that the
            percentage has gone. */}
        <p className={`boot__status${status.dev ? ' dev' : ''}`} aria-live="polite">
          {status.text}
        </p>
      </div>

      <p className="boot__skip" aria-hidden="true">
        tap anywhere to skip
      </p>
    </div>
  )
}
