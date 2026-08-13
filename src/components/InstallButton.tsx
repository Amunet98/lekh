import { useInstallPrompt } from '../hooks/useInstallPrompt'
import './InstallButton.css'

export function InstallButton() {
  const { canInstall, promptInstall } = useInstallPrompt()

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
      {/* Was a ⬇ emoji. Emoji are rendered by the platform's own font, so the
          one glyph of chrome in the header was the only mark in the app whose
          weight, colour and size we did not control — and it does not take
          currentColor, so it stayed black-and-blue on the accent hover fill.
          Same 24-box and stroke weight as the tab bar icons. */}
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
      Install
    </button>
  )
}
