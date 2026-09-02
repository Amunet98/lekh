import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslateState } from './hooks/useTranslateState'
import { TAB_ORDER, useAppNavigation } from './hooks/useAppNavigation'
import { TabSwitcher } from './components/TabSwitcher'
import { LekhMark } from './components/LekhMark'
import { TypePage } from './components/TypePage'
import { EDITOR_ID } from './components/Editor'
import { TranslatePage } from './components/TranslatePage'
import { CalendarPage } from './components/calendar/CalendarPage'
import { InstallButton } from './components/InstallButton'
import { BootScreen } from './components/BootScreen'
import { AboutSheet } from './components/AboutSheet'
import { AboutButton } from './components/AboutButton'
import { SettingsSheet } from './components/SettingsSheet'
import { SettingsButton } from './components/SettingsButton'
import { UpdatePrompt } from './components/UpdatePrompt'
import { WebAppNotice } from './components/WebAppNotice'
import { usePref } from './hooks/usePref'
import { useOnline } from './hooks/useOnline'
import { useToast } from './hooks/useToast'
import { warmOcrCacheInBackground } from './lib/ocr/prefetch'
import { refreshDynamicColor } from './lib/dynamicColor'
import './App.css'

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
  /* Tabs and sheets are both history, not just state — see useAppNavigation
     for the stack shape and for what Back is supposed to do at each level. */
  const { tab, goToTab, sheet, openSheet, closeSheet } = useAppNavigation()
  const [booting, setBooting] = useState(() => !bootedThisSession())
  // Lifted out of TranslatePage (which used to be two components, Translate
  // and Upload, each calling useTranslateState() themselves) so it survives
  // the tab unmounting/remounting rather than resetting on every visit.
  const translateState = useTranslateState()
  const [editorSize] = usePref('editorSize')
  const online = useOnline()
  const toast = useToast()

  /* On :root rather than on the editor, because two components read it — the
     Type editor and both translation panes — and a custom property is how one
     setting reaches both without either of them knowing the setting exists. */
  useEffect(() => {
    const scale = editorSize === 'xl' ? '1.3' : editorSize === 'lg' ? '1.15' : '1'
    document.documentElement.style.setProperty('--text-scale', scale)
  }, [editorSize])

  /* Alt+1..3 switch tabs, matching TAB_ORDER's left-to-right order. Alt-digit isn't
     text any browser inserts into a focused field, and useEditorState's own
     keydown handler already bails out on e.altKey — so no focus guard is
     needed here. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return
      const index = Number(e.key) - 1
      if (index < 0 || index >= TAB_ORDER.length) return
      e.preventDefault()
      goToTab(TAB_ORDER[index])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [goToTab])

  /* Announced on the change, never on arrival. Opening the app while already
     offline is not news — most of it works offline by design, and a warning
     toast on launch would be the first thing a perfectly functional typing
     app said about itself. Losing the connection mid-session is news. */
  const wasOnline = useRef(online)
  useEffect(() => {
    if (wasOnline.current === online) return
    wasOnline.current = online
    if (online) toast.done('Back online')
    else toast.problem('Offline — typing and Patro still work')
  }, [online, toast])

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

  /* Same "only once the splash leaves" timing as the caret-focus effect above
     — no need to compete with the boot screen's own network/CPU use, and no
     reason to fire on every tab switch. See prefetch.ts for why this exists. */
  useEffect(() => {
    if (booting) return
    warmOcrCacheInBackground()
  }, [booting])

  /* Material You. Not gated on `booting` like the two above: this one is a
     single bridge call that decides what colour the app is, and the boot
     screen is exactly the moment it should land — main.tsx has already
     repainted the cached palette, and this is what corrects it after the user
     changes their wallpaper. A no-op everywhere but the Android app.

     visibilitychange, because the wallpaper is changed *outside* this app:
     the user leaves, picks a new one, comes back. Without it the app keeps
     last launch's colours until it is killed. */
  useEffect(() => {
    void refreshDynamicColor()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshDynamicColor()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return (
    <>
      {booting && <BootScreen onDone={finishBoot} />}

      {/* One strip of chrome, not two. The section nav used to be a floating
          pill below this bar, which cost ~60px of vertical room on every
          screen and read as two competing headers. It is now the middle
          column of the bar itself — and on a phone the same element detaches
          to the bottom of the viewport as a dock (see TabSwitcher.css).

          That detaching is the reason .app-bar must not carry the
          backdrop-filter itself; the blur lives on .app-bar::before. Same
          reason .app-bar--is-booting animates margin-top, not transform —
          both create a containing block for position: fixed descendants, and
          this bar has one two levels down. See the comments in App.css, and
          do not move either back. */}
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
          <TabSwitcher active={tab} onChange={goToTab} />
          <div className="app-bar__actions">
            <InstallButton />
            <SettingsButton onClick={() => openSheet('settings')} />
            <AboutButton onClick={() => openSheet('about')} />
          </div>
        </div>
      </header>
      <div className={`page${booting ? ' page--is-booting' : ''}`}>
        {tab === 'type' ? (
          <TypePage
            cheatOpen={sheet === 'cheatsheet'}
            onOpenCheatSheet={() => openSheet('cheatsheet')}
            onCloseCheatSheet={closeSheet}
          />
        ) : tab === 'translate' ? (
          <TranslatePage t={translateState} />
        ) : (
          <CalendarPage />
        )}
      </div>

      <AboutSheet open={sheet === 'about'} onClose={closeSheet} onGoTo={goToTab} />
      <SettingsSheet open={sheet === 'settings'} onClose={closeSheet} />

      {/* Always mounted — the hook inside it is what registers the service
          worker. It renders nothing until an update is waiting, and nothing at
          all while the boot screen is up. Kept outside .page so the boot fade
          doesn't touch it, and last in the tree so it lands late in the reading
          order: it is an aside, not content.

          An open sheet suppresses it for the same reason booting does, one layer
          up: showModal() puts the sheet in the top layer, above every z-index
          this stylesheet could name, and marks the rest of the document inert.
          The toast rendered dimmed behind the sheet with both buttons dead —
          exactly the failure this prop was added for. */}
      <UpdatePrompt suppressed={booting || sheet !== null} />
      {/* Renders only inside an installed Android *web* app — the one thing
          Chrome's ⋮ menu can still produce and the manifest cannot prevent.
          Suppressed by booting/an open sheet for exactly the reasons above;
          the About sheet's top layer would strand this card's buttons the same
          way it stranded the update toast's. */}
      <WebAppNotice suppressed={booting || sheet !== null} />
    </>
  )
}

export default App
