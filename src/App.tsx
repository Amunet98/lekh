import { useState } from 'react'
import { TabSwitcher, type Tab } from './components/TabSwitcher'
import { TypePage } from './components/TypePage'
import { UploadPage } from './components/UploadPage'
import { TranslatePage } from './components/TranslatePage'
import { ThemeToggle } from './components/ThemeToggle'
import { InstallButton } from './components/InstallButton'
import { Footer } from './components/Footer'
import './App.css'

function App() {
  const [tab, setTab] = useState<Tab>('type')
  // Upload's "Edit in Translate" handoff — TranslatePage consumes and clears
  // this on mount so re-entering Upload later doesn't replay a stale handoff.
  const [handoffText, setHandoffText] = useState<string | null>(null)

  const editInTranslate = (text: string) => {
    setHandoffText(text)
    setTab('translate')
  }

  return (
    <>
      <header className="app-bar">
        <div className="app-bar__inner">
          <span className="app-bar__brand">
            <span className="dev">लेख</span>
            <span className="sep">/</span>lekh
          </span>
          <div className="app-bar__actions">
            <InstallButton />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <div className="page">
        <TabSwitcher active={tab} onChange={setTab} />

        {tab === 'type' ? (
          <TypePage />
        ) : tab === 'upload' ? (
          <UploadPage onEditInTranslate={editInTranslate} />
        ) : (
          <TranslatePage
            handoffText={handoffText}
            onHandoffConsumed={() => setHandoffText(null)}
          />
        )}

        <Footer />
      </div>
    </>
  )
}

export default App
