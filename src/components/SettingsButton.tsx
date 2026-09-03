import './IconButton.css'

interface SettingsButtonProps {
  onClick: () => void
}

/* The 44px icon-button shape from IconButton.css, kept in its own file rather
   than inlined here: it outlived the About and theme buttons that used to sit
   beside it, and the next thing added to the bar should match it rather than
   guess. */
export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label="Settings"
      aria-haspopup="dialog"
      onClick={onClick}
    >
      {/* 22, where the dock's section icons are 20 and this was 19.
          A gear is a denser glyph than a pencil or a calendar — the toothed
          ring spends its outer ring on detail rather than on silhouette, so
          at a matching box it reads smaller than the icons it shares a bar
          with. Two extra pixels put its apparent size back on their level
          without making it the loudest thing in the bar. The 44px target is
          unchanged. */}
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
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
