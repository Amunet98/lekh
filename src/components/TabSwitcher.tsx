import { useEffect, useRef, type ReactNode } from 'react'
import { SectionIcon } from './SectionIcons'
import { tick } from '../lib/haptics'
import './TabSwitcher.css'

export type Tab = 'type' | 'translate' | 'calendar' | 'tools'

interface TabSwitcherProps {
  active: Tab
  onChange: (tab: Tab) => void
  /* Only the phone dock needs this, and only because it portals out of the
     app bar: inside the bar it inherited .app-bar--is-booting's opacity and
     pointer-events, and parented to <body> it inherits nothing. The boot
     screen sets pointer-events: none on itself, so without this the dock is
     invisible under the splash but still perfectly tappable — the exact
     failure App.css warns about for the bar. */
  booting?: boolean
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'type', label: 'Type', icon: <SectionIcon name="type" /> },
  { id: 'translate', label: 'Translate', icon: <SectionIcon name="translate" /> },
  { id: 'calendar', label: 'Patro', icon: <SectionIcon name="calendar" /> },
  { id: 'tools', label: 'Tools', icon: <SectionIcon name="tools" /> },
]

export function TabSwitcher({ active, onChange, booting = false }: TabSwitcherProps) {
  const ref = useRef<HTMLDivElement>(null)

  /* The dock's real height, for the Type page to fill the screen down to it
     (see .type-page in Editor.css). That used to subtract .page's 4.75rem
     bottom padding instead, which is the dock plus breathing room for the
     scrolling sections, so the editor stopped 17px short of the dock and a
     band of page background sat between the two on every phone. Measured
     rather than computed: the dock's height moves with the text-size
     setting, the label font and the gesture-bar inset, and a number written
     down in CSS was already wrong at the default. */
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const root = document.documentElement
    const write = () => root.style.setProperty('--dock-h', `${el.getBoundingClientRect().height}px`)
    write()
    const observer = new ResizeObserver(write)
    /* border-box, not the default content box. The gesture-bar inset is
       bottom padding (env(safe-area-inset-bottom)), and on a phone it
       arrives after the first layout — a content-box observer never saw it,
       so the dock measured 59px while drawing 83, and the editor's toolbar
       slid half under it (A024, 1.9.71). */
    observer.observe(el, { box: 'border-box' })
    return () => {
      observer.disconnect()
      root.style.removeProperty('--dock-h')
    }
  }, [])

  return (
    <div
      ref={ref}
      className={`tab-switcher${booting ? ' tab-switcher--is-booting' : ''}`}
      role="tablist"
      aria-label="Section"
    >
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          className={`tab-switcher__btn${active === id ? ' tab-switcher__btn--active' : ''}`}
          /* The dock is the most-tapped control in the app and had no haptic
             at all. Here rather than in the navigation hook on purpose — this
             is the tap; Alt+digit reaches the same place and should not buzz. */
          onClick={() => {
            tick()
            onChange(id)
          }}
        >
          <span className="tab-switcher__icon">{icon}</span>
          <span className="tab-switcher__label">{label}</span>
        </button>
      ))}
    </div>
  )
}
