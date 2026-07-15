import { useEffect, useState, type ReactNode } from 'react'
import { applyTheme, getInitialTheme, type Theme } from '../lib/theme'
import './ThemeToggle.css'

function AutoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="13" rx="1.5" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}

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

const OPTIONS: { id: Theme; label: string; icon: ReactNode }[] = [
  { id: 'auto', label: 'Auto', icon: <AutoIcon /> },
  { id: 'light', label: 'Light', icon: <SunIcon /> },
  { id: 'dark', label: 'Dark', icon: <MoonIcon /> },
]

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    // Under prefers-reduced-motion the dot-matrix canvas only repaints on
    // resize — nudge it so the dots pick up the new accent immediately.
    window.dispatchEvent(new Event('resize'))
  }, [theme])

  useEffect(() => {
    if (theme !== 'auto') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      applyTheme('auto')
      window.dispatchEvent(new Event('resize'))
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme])

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      {OPTIONS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className={`theme-toggle__btn${theme === id ? ' theme-toggle__btn--active' : ''}`}
          aria-label={label}
          aria-pressed={theme === id}
          onClick={() => setTheme(id)}
        >
          {icon}
        </button>
      ))}
    </div>
  )
}
