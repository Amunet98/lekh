import { useState } from 'react'
import { TabSwitcher, type Tab } from './components/TabSwitcher'
import { TypePage } from './components/TypePage'
import { UploadPage } from './components/UploadPage'
import { TranslatePage } from './components/TranslatePage'
import { ThemeToggle } from './components/ThemeToggle'
import { InstallButton } from './components/InstallButton'
import { Footer } from './components/Footer'
import { Landing } from './components/Landing'
import './App.css'

const LANDING_SEEN_KEY = 'lekh-seen-landing'

function hasSeenLanding(): boolean {
  try {
    return localStorage.getItem(LANDING_SEEN_KEY) === '1'
  } catch {
    // localStorage unavailable — show the landing every visit rather than
    // throw, matching the fallback style used by lib/theme.ts.
    return false
  }
}

function markLandingSeen(): void {
  try {
    localStorage.setItem(LANDING_SEEN_KEY, '1')
  } catch {
    // won't be remembered this session, but the app still proceeds
  }
}

function App() {
  const [tab, setTab] = useState<Tab>('type')
  const [showLanding, setShowLanding] = useState(() => !hasSeenLanding())
  // Upload's "Edit in Translate" handoff — TranslatePage consumes and clears
  // this on mount so re-entering Upload later doesn't replay a stale handoff.
  const [handoffText, setHandoffText] = useState<string | null>(null)

  const editInTranslate = (text: string) => {
    setHandoffText(text)
    setTab('translate')
  }

  const enterFromLanding = (nextTab?: Tab) => {
    markLandingSeen()
    setShowLanding(false)
    if (nextTab) setTab(nextTab)
  }

  if (showLanding) {
    return (
      <>
        <div className="landing-bar">
          <InstallButton />
          <ThemeToggle />
        </div>
        <Landing onEnter={enterFromLanding} />
      </>
    )
  }

  return (
    <>
      <header className="app-bar">
        <div className="app-bar__inner">
          <button
            type="button"
            className="app-bar__brand"
            aria-label="About Lekh"
            onClick={() => setShowLanding(true)}
          >
            <span className="dev">लेख</span>
            <span className="sep">/</span>lekh
          </button>
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
