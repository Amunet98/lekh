import { useCallback, useEffect, useState } from 'react'
import { TabSwitcher, type Tab } from './components/TabSwitcher'
import { LekhMark } from './components/LekhMark'
import { TypePage } from './components/TypePage'
import { EDITOR_ID } from './components/Editor'
import { UploadPage } from './components/UploadPage'
import { TranslatePage } from './components/TranslatePage'
import { CalendarPage } from './components/calendar/CalendarPage'
import { ThemeToggle } from './components/ThemeToggle'
import { InstallButton } from './components/InstallButton'
import { BootScreen } from './components/BootScreen'
import { AboutSheet } from './components/AboutSheet'
import { AboutButton } from './components/AboutButton'
import { UpdatePrompt } from './components/UpdatePrompt'
import './App.css'

const TABS: Tab[] = ['type', 'upload', 'translate', 'calendar']

function isTab(value: string | null): value is Tab {
  return value !== null && (TABS as string[]).includes(value)
}

/* Every section used to live at '/', so a section could not be linked, shared,
 * or opened from a PWA shortcut — and the manifest shortcuts added in
 * vite.config.ts need real targets. ?tab= is the whole routing story: four
 * screens, no nesting, no router dependency. */
function tabFromUrl(): Tab {
  try {
    const value = new URLSearchParams(location.search).get('tab')
    return isTab(value) ? value : 'type'
  } catch {
    return 'type'
  }
}

const BOOT_KEY = 'lekh-booted'

/* sessionStorage, and the choice of *session* is the whole point. The splash's
 * real job is hiding the Devanagari font reflow — BootScreen gates its dismiss
 * on document.fonts.ready, because Anek and Noto are fetched from Google Fonts
 * and the wordmark used to visibly re-shape a beat after paint. Fonts stay warm
 * for the rest of a session and may be cold in a new one, so once-per-session
 * keeps the screen for the case it was built for and stops charging ~1.5s to
 * every launch after the first. localStorage would go too far and let a
 * genuinely cold start reflow in the open.
 *
 * The redesign deleted the old lekh-seen-landing flag and never replaced it,
 * which is how this became a toll on every single launch, PWA shortcuts too. */
function bootedThisSession(): boolean {
  try {
    return sessionStorage.getItem(BOOT_KEY) === '1'
  } catch {
    // Storage blocked — show the splash. Never worth throwing over.
    return false
  }
}

function App() {
  const [tab, setTab] = useState<Tab>(tabFromUrl)
  const [booting, setBooting] = useState(() => !bootedThisSession())
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
  const finishBoot = useCallback(() => {
    setBooting(false)
    try {
      sessionStorage.setItem(BOOT_KEY, '1')
    } catch {
      // Blocked storage — the splash simply shows again next launch.
    }
  }, [])

  /* Hand over the caret, in an effect rather than inside finishBoot. Nothing
     was focused when the splash left, so the first keystroke after launch went
     to <body> and disappeared — and the tap or key that dismissed the splash
     was itself swallowed by the overlay, so the gesture the user meant for the
     editor bought them nothing at all.
   *
   * It has to run *after* the render that removes .page--is-booting, because
   * that class hides the page with visibility: hidden and a hidden element
   * cannot take focus. Calling focus() straight after setBooting(false) ran
   * against the previous DOM and silently did nothing.
   *
   * (pointer: fine) keeps this to mice and trackpads. Autofocusing a phone
   * throws the on-screen keyboard over the app the instant it appears, which
   * is a worse first impression than the missing caret. */
  useEffect(() => {
    if (booting || tab !== 'type') return
    try {
      if (!matchMedia('(pointer: fine)').matches) return
    } catch {
      return
    }
    document.getElementById(EDITOR_ID)?.focus()
    // Only when the splash leaves — not on every later tab switch back to Type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booting])

  return (
    <>
      {booting && <BootScreen onDone={finishBoot} />}

      {/* One strip of chrome, not two. The section nav used to be a floating
          pill below this bar, which cost ~60px of vertical room on every
          screen and read as two competing headers. It is now the middle
          column of the bar itself — and on a phone the same element detaches
          to the bottom of the viewport as a dock (see TabSwitcher.css).

          That detaching is the reason .app-bar must not carry the
          backdrop-filter itself; the blur lives on .app-bar::before. See the
          comment in App.css, and do not move it back. */}
      <header className={`app-bar${booting ? ' app-bar--is-booting' : ''}`}>
        <div className="app-bar__inner">
          {/* Not a button any more. It opened the About sheet, which was the
              only way in until the sheet got its own control in the actions
              row — and a wordmark that silently does something is a worse
              affordance than one that plainly does nothing. */}
          <span className="app-bar__brand">
            <span className="dev">
              <LekhMark inkClassName="app-bar__ink" />
              <span className="app-bar__brand-slash" aria-hidden="true">
                /
              </span>
              <span className="app-bar__brand-patro">पात्रो</span>
            </span>
          </span>
          <TabSwitcher active={tab} onChange={setTab} />
          <div className="app-bar__actions">
            <InstallButton />
            <ThemeToggle />
            <AboutButton onClick={() => setAboutOpen(true)} />
          </div>
        </div>
      </header>
      <div className={`page${booting ? ' page--is-booting' : ''}`}>
        {tab === 'type' ? (
          <TypePage />
        ) : tab === 'upload' ? (
          <UploadPage onEditInTranslate={editInTranslate} />
        ) : tab === 'translate' ? (
          <TranslatePage
            handoffText={handoffText}
            onHandoffConsumed={() => setHandoffText(null)}
          />
        ) : (
          <CalendarPage />
        )}
      </div>

      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} onGoTo={goToSection} />

      {/* Always mounted — the hook inside it is what registers the service
          worker. It renders nothing until an update is waiting, and nothing at
          all while the boot screen is up. Kept outside .page so the boot fade
          doesn't touch it, and last in the tree so it lands late in the reading
          order: it is an aside, not content.

          aboutOpen suppresses it for the same reason booting does, one layer
          up: showModal() puts the sheet in the top layer, above every z-index
          this stylesheet could name, and marks the rest of the document inert.
          The toast rendered dimmed behind the sheet with both buttons dead —
          exactly the failure this prop was added for. */}
      <UpdatePrompt suppressed={booting || aboutOpen} />
    </>
  )
}

export default App
