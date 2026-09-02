import './AboutButton.css'

interface SettingsButtonProps {
  onClick: () => void
}

/* The same 44px icon-button as About and the theme toggle beside it —
   .about-btn is imported rather than copied, because three adjacent icon
   buttons that disagree about their resting state look like a mistake. */
export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      type="button"
      className="about-btn"
      aria-label="Settings"
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
        <circle cx="12" cy="12" r="3.1" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a1.9 1.9 0 1 1-2.69 2.69l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a1.9 1.9 0 1 1-3.8 0v-.1a1.6 1.6 0 0 0-1.04-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06a1.9 1.9 0 1 1-2.69-2.69l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a1.9 1.9 0 1 1 0-3.8h.1a1.6 1.6 0 0 0 1.46-1.04 1.6 1.6 0 0 0-.32-1.77l-.06-.06a1.9 1.9 0 1 1 2.69-2.69l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a1.9 1.9 0 1 1 3.8 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a1.9 1.9 0 1 1 2.69 2.69l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a1.9 1.9 0 1 1 0 3.8h-.1a1.6 1.6 0 0 0-1.47.97Z" />
      </svg>
    </button>
  )
}
