import { useCallback, useEffect, useState } from 'react'
import { TabSwitcher, type Tab } from './components/TabSwitcher'
import { TypePage } from './components/TypePage'
import { UploadPage } from './components/UploadPage'
import { TranslatePage } from './components/TranslatePage'
import { ThemeToggle } from './components/ThemeToggle'
import { InstallButton } from './components/InstallButton'
import { Footer } from './components/Footer'
import { BootScreen } from './components/BootScreen'
import { AboutSheet } from './components/AboutSheet'
import './App.css'

const TABS: Tab[] = ['type', 'upload', 'translate']

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as string[]).includes(value)
}

/* Every section used to live at '/', so a section could not be linked, shared,
 * or opened from a PWA shortcut — and the manifest shortcuts added in
 * vite.config.ts need real targets. ?tab= is the whole routing story: three
 * screens, no nesting, no router dependency. */
function tabFromUrl(): Tab {
  try {
    const value = new URLSearchParams(location.search).get('tab')
    return isTab(value) ? value : 'type'
  } catch {
    return 'type'
  }
}

function App() {
  const [tab, setTab] = useState<Tab>(tabFromUrl)
  const [booting, setBooting] = useState(true)
  const [aboutOpen, setAboutOpen] = useState(false)
  // Upload's "Edit in Translate" handoff — TranslatePage consumes and clears
  // this on mount so re-entering Upload later doesn't replay a stale handoff.
  const [handoffText, setHandoffText] = useState<string | null>(null)

  /* replaceState, not pushState: the tab bar is a view switch, not navigation,
     and pushing would make the browser Back button walk through every tab a
     user had touched before it left the app. */
  useEffect(() => {
    try {
      const url = new URL(location.href)
      if (tab === 'type') url.searchParams.delete('tab')
      else url.searchParams.set('tab', tab)
      if (url.href !== location.href) history.replaceState(null, '', url)
    } catch {
      // Non-browser or restricted context — the tab still switches, the URL
      // just doesn't follow. Never worth throwing over.
    }
  }, [tab])

  /* popstate keeps the app honest if something else edits the URL (a manifest
     shortcut opened into an existing client, or the user editing ?tab= by
     hand). Without it the address bar and the visible section can disagree. */
  useEffect(() => {
    const sync = () => setTab(tabFromUrl())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const editInTranslate = (text: string) => {
    setHandoffText(text)
    setTab('translate')
  }

  const goToSection = (next: Tab) => {
    setTab(next)
    setAboutOpen(false)
  }

  /* Stable identity — BootScreen takes it as an effect dependency, and a fresh
     closure every render would restart the boot timer on every render. */
  const finishBoot = useCallback(() => setBooting(false), [])

  return (
    <>
      {/* Ambient light behind everything. Rendered once, outside the page, and
          left mounted for the app's lifetime — see .aurora in index.css. */}
      <div className="aurora" aria-hidden="true">
        <div className="aurora__blob aurora__blob--1" />
        <div className="aurora__blob aurora__blob--2" />
        <div className="aurora__blob aurora__blob--3" />
      </div>

      {booting && <BootScreen onDone={finishBoot} />}

      <header className={`app-bar${booting ? ' app-bar--is-booting' : ''}`}>
        <div className="app-bar__inner">
          <button
            type="button"
            className="app-bar__brand"
            aria-label="About Lekh"
            aria-haspopup="dialog"
            onClick={() => setAboutOpen(true)}
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
      <div className={`page${booting ? ' page--is-booting' : ''}`}>
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

      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} onGoTo={goToSection} />
    </>
  )
}

export default App
