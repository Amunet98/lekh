import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useHasAndroidApp } from '../hooks/useHasAndroidApp'
import { APK_URL, isAndroid } from '../lib/androidApp'
import './InstallButton.css'

function DownloadIcon() {
  return (
    /* Was a ⬇ emoji. Emoji are rendered by the platform's own font, so the one
       glyph of chrome in the header was the only mark in the app whose weight,
       colour and size we did not control — and it does not take currentColor,
       so it stayed black-and-blue on the accent hover fill. Same 24-box and
       stroke weight as the tab bar icons. */
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M4 20h16" />
    </svg>
  )
}

/* One install affordance per platform, and on Android it is the APK.
 *
 * This button used to fire the PWA install prompt on every platform. On
 * Android that was actively misleading: it was the most prominent control on
 * the page and it installed the *web app*, which cannot have a home-screen
 * widget — while the APK, which is a full app and carries the widget, was
 * behind the About sheet. The obvious button gave you the lesser thing,
 * which is exactly what the owner hit.
 *
 * Nothing is lost by not offering the PWA prompt on Android: Chrome keeps its
 * own "Install app" entry in the overflow menu for anyone who would rather not
 * sideload. Everywhere else — desktop, and any browser that fires
 * beforeinstallprompt — the prompt is still the right and only option.
 */
export function InstallButton() {
  const { canInstall, promptInstall } = useInstallPrompt()
  const hasApp = useHasAndroidApp()

  /* Nothing left to offer: either we are inside the installed app, or we are in
     a browser tab on a device that already has the APK. The second case is the
     one that used to slip through — display-mode is not standalone there. */
  if (hasApp) return null

  if (isAndroid()) {
    return (
      <a
        className="install-btn"
        href={APK_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Get the Android app, which includes the Patro home-screen widget"
      >
        <DownloadIcon />
        Get app
      </a>
    )
  }

  if (!canInstall) return null

  return (
    <button
      type="button"
      className="install-btn"
      /* Explicit, because below 480px the CSS collapses the label to
         font-size: 0 to fit the bar. That leaves the text in the
         accessibility tree, so the name would survive on its own — but the
         name is doing real work here and should not depend on a stylesheet
         detail somebody could reasonably change. */
      aria-label="Install Lekh"
      onClick={() => void promptInstall()}
    >
      <DownloadIcon />
      Install
    </button>
  )
}
