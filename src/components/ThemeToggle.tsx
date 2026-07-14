import { useEffect, useState } from 'react'
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme'
import './ThemeToggle.css'

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.94" y2="5.94" />
      <line x1="18.06" y1="18.06" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.94" y2="18.06" />
      <line x1="18.06" y1="5.94" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354Z"
      />
    </svg>
  )
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    // Under prefers-reduced-motion the dot-matrix canvas only repaints on
    // resize — nudge it so the dots pick up the new accent immediately.
    window.dispatchEvent(new Event('resize'))
  }, [theme])

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={
        theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
      }
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
