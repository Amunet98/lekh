import type { ReactNode } from 'react'
import { SectionIcon } from './SectionIcons'
import './TabSwitcher.css'

export type Tab = 'type' | 'upload' | 'translate'

interface TabSwitcherProps {
  active: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'type', label: 'Type', icon: <SectionIcon name="type" /> },
  { id: 'upload', label: 'Upload', icon: <SectionIcon name="upload" /> },
  { id: 'translate', label: 'Translate', icon: <SectionIcon name="translate" /> },
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
          onClick={() => onChange(id)}
        >
          <span className="tab-switcher__icon">{icon}</span>
          <span className="tab-switcher__label">{label}</span>
        </button>
      ))}
    </div>
  )
}
