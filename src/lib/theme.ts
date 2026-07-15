export type Theme = 'light' | 'dark'

// Bare 'theme' key (not lekh:-prefixed) — must match the FOUC bootstrap
// script in index.html, which reads it before first paint.
const THEME_KEY = 'theme'

export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // localStorage unavailable — fall through to the OS preference
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  // Keeps the installed PWA's Android status bar in sync with the app
  // theme — Chrome applies live meta changes in standalone mode, no
  // reinstall needed. Must match --bg for each theme in index.css.
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    theme === 'dark' ? '#16171d' : '#ffffff',
  )
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // theme still applies this visit, just won't be remembered
  }
}
