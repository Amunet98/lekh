import { useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdatePrompt.css'

/* Hourly. The check is a conditional GET for sw.js — a few hundred bytes
 * against an ETag — so the interval can be generous and still beat the old
 * behaviour of never checking at all. */
const UPDATE_INTERVAL_MS = 60 * 60 * 1000

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
  /* True only if *this* window is the one whose Reload button was pressed.
     See onNeedReload below — the whole point is that the answer can be no. */
  const reloadRequested = useRef(false)

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

  /* Suppressed during boot, and that is the normal path rather than an edge
     case: the update check runs at page load, which is exactly when the splash
     is up. Left visible, the toast showed *through* the boot screen's frosted
     sheet — legible, hazy, and un-tappable, since the overlay swallows the
     clicks. It waits the ~1.1s and animates in against the app instead. */
  if (!needRefresh || suppressed) return null

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
