import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdatePrompt.css'

/* Hourly. The check is a conditional GET for sw.js — a few hundred bytes
 * against an ETag — so the interval can be generous and still beat the old
 * behaviour of never checking at all. */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000

/* How long after mount a newly-detected update still counts as "found on
 * this fresh load" rather than "found while someone was using the app."
 * vite-plugin-pwa resolves its first check within a second or two of
 * registering, so anything inside this window is that initial check, not
 * the hourly one in onRegisteredSW below — the hourly one cannot possibly
 * fire this early. The distinction matters because within this window the
 * editor is provably empty: it is component state in a page that has not
 * finished its first render cycle, so nothing has been typed into it yet.
 * That is what makes it safe to skip the prompt and just apply silently. */
const FRESH_LOAD_WINDOW_MS = 5_000

/* Why this exists.
 *
 * The service worker used to be registered with `autoUpdate`, which sounds
 * like it keeps people current and does not. A new worker installs in the
 * background, but the *installed PWA* keeps serving the shell it already
 * precached until every window of the app is closed — so a phone can sit on a
 * build for days with no signal that it has. That is not hypothetical: a
 * redesign was reported as "the frost and blur isn't showing up" when the only
 * thing wrong was that the app had never picked up the build containing it.
 *
 * So the worker now waits (registerType: 'prompt' in vite.config.ts) and this
 * is the thing that tells you. One toast, per deploy, dismissible.
 */
interface UpdatePromptProps {
  /**
   * Hide the toast without unmounting the component — true while the boot
   * screen is up. See the note below on why this is a prop and not a
   * conditional render at the call site.
   */
  suppressed?: boolean
}

export function UpdatePrompt({ suppressed = false }: UpdatePromptProps) {
  /* This hook is what registers the service worker, so the component has to
     stay mounted from the first frame — gating it behind `booting` at the call
     site would tie *whether the app has a service worker at all* to whether a
     toast happens to be on screen. Hence a prop that suppresses the render
     while the hook keeps running. */
  /* True only if *this* window is the one whose Reload button was pressed —
     or the one that auto-applied a fresh-load update, see below. See
     onNeedReload below — the whole point is that the answer can be no. */
  const reloadRequested = useRef(false)

  /* Flips once, FRESH_LOAD_WINDOW_MS after mount, and never back. Timer-driven
     rather than a Date.now() comparison at render time on purpose — a bare
     Date.now() call in a component body is an impure call during render (this
     repo's react-hooks/purity rule rejects it, and rightly: it would make the
     render's output depend on when it happened to run rather than only on
     props/state). Routing the flip through a real state update in a setTimeout
     callback keeps the whole component pure and gives the render body a plain
     boolean to check instead of a clock to consult. */
  const [freshLoadWindowExpired, setFreshLoadWindowExpired] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setFreshLoadWindowExpired(true), FRESH_LOAD_WINDOW_MS)
    return () => clearTimeout(timer)
  }, [])

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    /* The missing half of the story above. The worker waits, and this told you
       when one was waiting — but only if something asked. A page load asks; a
       long-lived installed PWA never reloads, so it never re-fetched sw.js and
       needRefresh never flipped. The stale-build-on-a-phone problem this
       component was written to solve survived it, and only ever resolved on a
       manual reload, which is the one case the old autoUpdate already handled.

       navigator.onLine is a cheap negative: false is reliable, true is not, so
       this skips the certain waste and lets the rest fail harmlessly. */
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      setInterval(() => {
        if (navigator.onLine) void registration.update()
      }, UPDATE_INTERVAL_MS)
    },

    /* Without this the library attaches its own 'controlling' listener that
       calls window.location.reload() — in every client the new worker claims,
       not just the one that asked. Two windows open, press Reload in one, and
       the other reloads too and silently discards whatever was typed in its
       editor, which is exactly what "Later" and the note below promise will
       not happen. Providing onNeedReload replaces that default and lets each
       window decide for itself.

       A window that declines keeps running the build it loaded with; it picks
       up the new one on its next navigation, which is the same deal "Later"
       already offered. */
    onNeedReload() {
      if (reloadRequested.current) window.location.reload()
    },
  })

  /* The fresh-load case: apply immediately instead of showing the toast, and
   * — just as importantly — never paint the toast at all while that's still
   * the plan. Someone who just updated via the Play Store, or opened the app
   * for the first time in a while, should not be greeted with a
   * website-style "reload to update" banner; that undercuts the entire point
   * of wrapping the site as a native-feeling app. The render guard below
   * unconditionally hides the toast for the whole fresh-load window — not
   * only once this effect has decided to act — so there is no render in
   * between where needRefresh is true and the toast is visible while this
   * effect hasn't run yet.
   *
   * Safe specifically because of the timing: this window closes before the
   * editor could hold anything worth protecting — it is component state in a
   * page that has not finished its first render cycle when this opens.
   * Anything detected later (the hourly check in onRegisteredSW above) falls
   * through to the normal prompt, because by then it might not be.
   *
   * Also waits out `suppressed` (boot screen / About sheet) before actually
   * reloading. Reloading mid-boot would restart the splash animation from
   * zero the instant it finished — sessionStorage's boot flag isn't set
   * until finishBoot runs, so an interrupted boot looks exactly like a fresh
   * one to bootedThisSession and plays again. Detection can happen early;
   * the reload itself waits for a moment with nothing on screen worth
   * cutting off. No local setState here — the effect's only job is the
   * external call, and reloadRequested is a ref precisely because writing it
   * is not a React update the render needs to react to. */
  const appliedFreshUpdate = useRef(false)
  useEffect(() => {
    if (!needRefresh || freshLoadWindowExpired || suppressed || appliedFreshUpdate.current) return
    appliedFreshUpdate.current = true
    reloadRequested.current = true
    void updateServiceWorker(true)
  }, [needRefresh, freshLoadWindowExpired, suppressed, updateServiceWorker])

  /* Suppressed during boot, and that is the normal path rather than an edge
     case: the update check runs at page load, which is exactly when the splash
     is up. Left visible, the toast showed *through* the boot screen's frosted
     sheet — legible, hazy, and un-tappable, since the overlay swallows the
     clicks. It waits the ~1.1s and animates in against the app instead.

     !freshLoadWindowExpired belongs in this same guard, not just in the effect
     above — it is what keeps the toast from ever painting during the window
     a fresh-load update is meant to apply silently, regardless of exactly
     when in that window the effect gets around to running. */
  if (!needRefresh || suppressed || !freshLoadWindowExpired) return null

  return (
    /* role="status" + polite, not an alert: a new version is worth mentioning
       and never worth interrupting a screen reader mid-sentence for. It also
       must not steal focus — someone could be typing when this appears. */
    <div className="update-prompt" role="status" aria-live="polite">
      <p className="update-prompt__text">
        <span className="update-prompt__dot" aria-hidden="true" />
        A new version of <span className="update-prompt__mark">लेख</span>
        <span className="update-prompt__slash">/</span>
        <span className="update-prompt__patro">पात्रो</span> is ready.
      </p>
      {/*
        Said plainly rather than discovered afterwards. Reloading throws away
        whatever is in the editor — its text is component state, not persisted
        — and this prompt can appear at any moment, including mid-sentence.
        "Later" is therefore a real answer: the update installs on the next
        launch either way, so nothing is lost by putting it off.
      */}
      <p className="update-prompt__note">Reloading clears anything typed in the editor.</p>
      <div className="update-prompt__actions">
        <button
          type="button"
          className="update-prompt__btn update-prompt__btn--ghost"
          onClick={() => setNeedRefresh(false)}
        >
          Later
        </button>
        <button
          type="button"
          className="update-prompt__btn update-prompt__btn--primary"
          onClick={() => {
            reloadRequested.current = true
            void updateServiceWorker(true)
          }}
        >
          Reload
        </button>
      </div>
    </div>
  )
}
