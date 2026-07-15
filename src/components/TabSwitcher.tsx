import type { ReactNode } from 'react'
import './TabSwitcher.css'

export type Tab = 'type' | 'upload' | 'translate'

interface TabSwitcherProps {
  active: Tab
  onChange: (tab: Tab) => void
}

function iconProps() {
  return {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
}

function TypeIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 15V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

function TranslateIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M4 7h9M4 7l3-3M4 7l3 3" />
      <path d="M20 17h-9M20 17l-3-3M20 17l-3 3" />
    </svg>
  )
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'type', label: 'Type', icon: <TypeIcon /> },
  { id: 'upload', label: 'Upload', icon: <UploadIcon /> },
  { id: 'translate', label: 'Translate', icon: <TranslateIcon /> },
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
