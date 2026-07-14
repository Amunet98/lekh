import { useState } from 'react'
import { DotMatrixBackground } from './components/DotMatrixBackground'
import { TabSwitcher, type Tab } from './components/TabSwitcher'
import { TypePage } from './components/TypePage'
import { ScanPage } from './components/ScanPage'
import { ThemeToggle } from './components/ThemeToggle'
import './App.css'

function App() {
  const [tab, setTab] = useState<Tab>('type')

  return (
    <>
      <DotMatrixBackground />
      <div className="page">
        <header className="page-header">
          <ThemeToggle />
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

        {tab === 'type' ? <TypePage /> : <ScanPage />}
      </div>
    </>
  )
}

export default App
