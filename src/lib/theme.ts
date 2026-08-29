import { syncThemeColor } from './dynamicColor'

export type Theme = 'light' | 'dark' | 'auto'
type ResolvedTheme = 'light' | 'dark'

// Bare 'theme' key (not lekh:-prefixed) — must match the FOUC bootstrap
// script in index.html, which reads it before first paint. The bootstrap
// script only special-cases the literal 'light'/'dark' strings — 'auto'
// (and anything else, including a missing key) already falls through to
// its own matchMedia check there, so it needs no changes for 'auto'.
const THEME_KEY = 'theme'

export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored
  } catch {
    // localStorage unavailable — fall through to the default
  }
  return 'auto'
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'auto') {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme)
  document.documentElement.dataset.theme = resolved
  // Keeps the installed PWA's Android status bar in sync with the app
  // theme — Chrome applies live meta changes in standalone mode, no
  // reinstall needed.
  //
  // It reads the computed --bg rather than carrying its own copy of the two
  // hex values, which is what it used to do under a comment reading "must
  // match --bg for each theme in index.css". That was one palette ago. Under
  // Material You there are no longer two values to hard-code — --bg is
  // whatever the wallpaper made it (src/lib/dynamicColor.ts) — and asking the
  // element what colour it actually is cannot drift from the answer.
  //
  // The tag is still looked up by id, not by name. A name selector is what
  // broke this before: a media-scoped tag was added above it, querySelector
  // matched that one instead, and switching to light on a dark-OS phone
  // stamped the colour into a tag the browser wasn't using.
  syncThemeColor()
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // theme still applies this visit, just won't be remembered
  }
}
