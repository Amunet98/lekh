import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdatePrompt.css'

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
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

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
    <div className="update-prompt glass" role="status" aria-live="polite">
      <p className="update-prompt__text">
        <span className="update-prompt__dot" aria-hidden="true" />
        A new version of <span className="dev">लेख</span> is ready.
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
          onClick={() => void updateServiceWorker(true)}
        >
          Reload
        </button>
      </div>
    </div>
  )
}
