import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { bootDynamicColor } from './lib/dynamicColor'
import { applyTheme, getInitialTheme } from './lib/theme'
import { setHapticsEnabled } from './lib/haptics'
import { getPref } from './lib/prefs'
import { ToastProvider } from './components/Toast'
import App from './App.tsx'

/* Before the first render, and deliberately not inside a component. This
 * repaints last launch's Material You palette from cache synchronously; the
 * live one is fetched from the OS once App mounts. Doing it in an effect
 * instead would put a frame of flag crimson in front of every launch. */
bootDynamicColor()

/* Both of these used to be a component's job and neither should have been.
 *
 * The theme was applied by an effect inside ThemeToggle, which meant the
 * status-bar meta colour depended on that one button being mounted; now that
 * two controls share the theme, applying it belongs to the app starting up,
 * not to whichever control happens to render. index.html's bootstrap has
 * already set data-theme before first paint — this is what makes the rest of
 * applyTheme (the theme-color tag) agree with it.
 *
 * Haptics are read once, here, because the setting is a device property and
 * every caller wants the same answer; the Settings sheet pushes changes in. */
applyTheme(getInitialTheme())
setHapticsEnabled(getPref('haptics'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outside App so anything in the tree, App included, can reach it. */}
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
