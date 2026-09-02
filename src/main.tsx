import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { bootDynamicColor } from './lib/dynamicColor'
import { applyTheme, getInitialTheme, watchSystemTheme } from './lib/theme'
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
 * status-bar meta colour depended on that one button being mounted. The theme
 * now lives in the Settings sheet, which is unmounted most of the time, so
 * applying it and watching the OS for changes both belong to the app starting
 * up rather than to whichever control happens to render. index.html's
 * bootstrap has already set data-theme before first paint — this is what makes
 * the rest of applyTheme (the theme-color tag, the native status bar) agree
 * with it.
 *
 * Haptics are read once, here, because the setting is a device property and
 * every caller wants the same answer; the Settings sheet pushes changes in. */
applyTheme(getInitialTheme())
watchSystemTheme()
setHapticsEnabled(getPref('haptics'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outside App so anything in the tree, App included, can reach it. */}
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
