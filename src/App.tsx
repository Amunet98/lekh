import { useState } from 'react'
import { DotMatrixBackground } from './components/DotMatrixBackground'
import { TabSwitcher, type Tab } from './components/TabSwitcher'
import { TypePage } from './components/TypePage'
import { ScanPage } from './components/ScanPage'
import { TranslatePage } from './components/TranslatePage'
import { ThemeToggle } from './components/ThemeToggle'
import { InstallButton } from './components/InstallButton'
import './App.css'

function App() {
  const [tab, setTab] = useState<Tab>('type')
  // Scan's "Edit in Translate" handoff — TranslatePage consumes and clears
  // this on mount so re-entering Scan later doesn't replay a stale handoff.
  const [handoffText, setHandoffText] = useState<string | null>(null)

  const editInTranslate = (text: string) => {
    setHandoffText(text)
    setTab('translate')
  }

  return (
    <>
      <DotMatrixBackground />
      <div className="page">
        <header className="page-header">
          <div className="page-header__actions">
            <InstallButton />
            <ThemeToggle />
          </div>
          <span className="tag">Nepali typing, scanning &amp; translation</span>
          <h1>
            <span className="dev">लेख</span>
            <span className="sep">/</span>lekh
          </h1>
          <p className="tagline">
            Type Nepali the way you already text it —{' '}
            <span className="dev">kasto chha</span> becomes{' '}
            <span className="dev">कस्तो छ</span> as you type. No app install, no account,
            no cloud.
          </p>
        </header>

        <TabSwitcher active={tab} onChange={setTab} />

        {tab === 'type' ? (
          <TypePage />
        ) : tab === 'scan' ? (
          <ScanPage onEditInTranslate={editInTranslate} />
        ) : (
          <TranslatePage
            handoffText={handoffText}
            onHandoffConsumed={() => setHandoffText(null)}
          />
        )}
      </div>
    </>
  )
}

export default App
