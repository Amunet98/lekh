import type { ReactNode } from 'react'
import { SectionIcon } from './SectionIcons'
import { tick } from '../lib/haptics'
import './TabSwitcher.css'

export type Tab = 'type' | 'translate' | 'calendar'

interface TabSwitcherProps {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'type', label: 'Type', icon: <SectionIcon name="type" /> },
  { id: 'translate', label: 'Translate', icon: <SectionIcon name="translate" /> },
  { id: 'calendar', label: 'Patro', icon: <SectionIcon name="calendar" /> },
]

export function TabSwitcher({ active, onChange }: TabSwitcherProps) {
  return (
    <div className="tab-switcher" role="tablist" aria-label="Section">
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
