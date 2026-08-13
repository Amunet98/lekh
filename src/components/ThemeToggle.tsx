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

/* One button that cycles, rather than three that sit there permanently.
 *
 * Three icon buttons is a segmented control's worth of chrome spent on a
 * setting most people touch once, and it took a third of the app bar's action
 * area. Cycling is the standard treatment for a three-state preference where
 * the states have an obvious order.
 *
 * The order matters: auto -> light -> dark -> auto. Starting from the default
 * and stepping toward the explicit choices means the first press from a fresh
 * install always does something visible on a dark-OS phone. */
const ORDER: Theme[] = ['auto', 'light', 'dark']

const META: Record<Theme, { label: string; icon: ReactNode }> = {
  auto: { label: 'System', icon: <AutoIcon /> },
  light: { label: 'Light', icon: <SunIcon /> },
  dark: { label: 'Dark', icon: <MoonIcon /> },
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'auto') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('auto')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme])

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]

  return (
    <button
      type="button"
      className="theme-toggle"
      /* Names the current state *and* what pressing does. An icon-only
         control that announced only its icon left a screen-reader user with
         no way to tell which of the three modes was live. */
      aria-label={`Theme: ${META[theme].label}. Switch to ${META[next].label}.`}
      title={`Theme: ${META[theme].label}`}
      onClick={() => setTheme(next)}
    >
      {META[theme].icon}
    </button>
  )
}
