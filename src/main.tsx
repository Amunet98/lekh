import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { bootDynamicColor } from './lib/dynamicColor'
import { ToastProvider } from './components/Toast'
import App from './App.tsx'

/* Before the first render, and deliberately not inside a component. This
 * repaints last launch's Material You palette from cache synchronously; the
 * live one is fetched from the OS once App mounts. Doing it in an effect
 * instead would put a frame of flag crimson in front of every launch. */
bootDynamicColor()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outside App so anything in the tree, App included, can reach it. */}
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
)
