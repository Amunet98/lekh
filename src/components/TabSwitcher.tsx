import './TabSwitcher.css'

export type Tab = 'type' | 'translate'

interface TabSwitcherProps {
  active: Tab
  onChange: (tab: Tab) => void
}

export function TabSwitcher({ active, onChange }: TabSwitcherProps) {
  return (
    <div className="tab-switcher" role="tablist" aria-label="Section">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'type'}
        className={`tab-switcher__btn${active === 'type' ? ' tab-switcher__btn--active' : ''}`}
        onClick={() => onChange('type')}
      >
        Type
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'translate'}
        className={`tab-switcher__btn${active === 'translate' ? ' tab-switcher__btn--active' : ''}`}
        onClick={() => onChange('translate')}
      >
        Translate
      </button>
    </div>
  )
}
