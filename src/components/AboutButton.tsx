import './AboutButton.css'

interface AboutButtonProps {
  onClick: () => void
}

/* The About sheet used to have exactly one way in: tapping the wordmark.
 *
 * That was a nice touch and an invisible one. Nobody hunts for an affordance
 * they have no reason to believe exists, so in practice the sheet — which is
 * where the app explains what it is, and where Android visitors learn the APK
 * is the only build with a home-screen widget — was reachable only by being
 * told about it. This is the same sheet, with a control that says so.
 *
 * The wordmark's onClick is gone now (see App.tsx) — this button is the only
 * way in.
 */
export function AboutButton({ onClick }: AboutButtonProps) {
  return (
    <button
      type="button"
      className="about-btn"
      aria-label="About Lekh Patro"
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        width="19"
        height="19"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 7.75h.01" />
      </svg>
    </button>
  )
}
