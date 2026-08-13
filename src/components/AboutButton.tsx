import './AboutButton.css'

interface AboutButtonProps {
  onClick: () => void
}

/* The About sheet had exactly one way in: tapping the wordmark.
 *
 * That is a nice touch and an invisible one. Nobody hunts for an affordance
 * they have no reason to believe exists, so in practice the sheet — which is
 * where the app explains what it is, and where Android visitors learn the APK
 * is the only build with a home-screen widget — was reachable only by being
 * told about it. This is the same sheet, with a control that says so.
 *
 * The wordmark keeps working. It costs nothing and people who found it once
 * will go back to it.
 */
export function AboutButton({ onClick }: AboutButtonProps) {
  return (
    <button
      type="button"
      className="about-btn"
      aria-label="About Lekh"
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
