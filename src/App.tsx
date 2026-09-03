import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslateState } from './hooks/useTranslateState'
import { TAB_ORDER, useAppNavigation } from './hooks/useAppNavigation'
import type { Tab } from './components/TabSwitcher'
import { TabSwitcher } from './components/TabSwitcher'
import { LekhMark } from './components/LekhMark'
import { TypePage } from './components/TypePage'
import { EDITOR_ID } from './components/Editor'
import { TranslatePage } from './components/TranslatePage'
import { CalendarPage } from './components/calendar/CalendarPage'
import { InstallButton } from './components/InstallButton'
import { BootScreen } from './components/BootScreen'
import { Screen } from './components/Screen'
import { AboutScreen } from './components/AboutScreen'
import { SettingsScreen } from './components/SettingsScreen'
import { SettingsButton } from './components/SettingsButton'
import { UpdatePrompt } from './components/UpdatePrompt'
import { WebAppNotice } from './components/WebAppNotice'
import { usePref } from './hooks/usePref'
import { useOnline } from './hooks/useOnline'
import { useKeyboardOpen } from './hooks/useKeyboardOpen'
import { useDockDetached } from './hooks/useDockDetached'
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

/* A section, kept.
 *
 * Switching used to unmount one section and mount the next, inside the
 * flushSync inside the view transition — so the browser sat on the outgoing
 * frame while React built a whole screen, and only then started the animation
 * it was supposed to be playing. Measured with long-animation-frame at 4x
 * throttle, arriving at Patro was a 202ms frame: 85ms of script building the
 * month grid and the converter, then layout and paint on top. That is not a
 * slow animation, it is an animation that has not started yet, and it was the
 * one thing in the app that still felt like a page load.
 *
 * So a section is built once and then kept. The cost moves to the first visit
 * of a session and every visit after it is a class change.
 *
 * display: none is the floor — universal, and it is what browsers without the
 * property below fall back to. content-visibility: hidden is the same idea
 * done properly: it collapses the box exactly as display: none does and drops
 * it from paint, hit-testing and the accessibility tree, but it *keeps the
 * rendering state* rather than throwing it away, which is the whole difference
 * between showing a section again and laying it out again. Both are wrapped in
 * @supports rather than assumed, because the build still targets safari14 and
 * an unknown property there would leave all three sections stacked on screen
 * at once.
 *
 * inert as well, and not as decoration: it is the one guarantee that does not
 * depend on either property being implemented the way the spec describes. An
 * off-screen section must not hold a tab stop or answer a screen reader. */
function Section({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className={`section${active ? '' : ' section--idle'}`} inert={!active}>
      {children}
    </div>
  )
}

function App() {
  /* Tabs and sheets are both history, not just state — see useAppNavigation
     for the stack shape and for what Back is supposed to do at each level. */
  const { tab, goToTab, sheet, openSheet, closeSheet } = useAppNavigation()
  const [booting, setBooting] = useState(() => !bootedThisSession())
  /* Which sections exist yet. Lazily, so a launch still only builds the screen
     it lands on — the point is not to pay for Patro up front, it is to pay for
     it once. Adjusted during render rather than in an effect: the tab change
     happens inside a flushSync (see useAppNavigation), and a section that
     appeared a render later would be a section the view transition snapshotted
     as empty. */
  const [visited, setVisited] = useState<Tab[]>(() => [tab])
  if (!visited.includes(tab)) setVisited([...visited, tab])
  // Lifted out of TranslatePage (which used to be two components, Translate
  // and Upload, each calling useTranslateState() themselves) so it survives
  // the tab unmounting/remounting rather than resetting on every visit.
  const translateState = useTranslateState()
  const [editorSize] = usePref('editorSize')
  const online = useOnline()
  const toast = useToast()

  /* The two blurred bars are the most expensive thing on the page per frame,
     and while a sheet is open they sit behind a 55%-opaque scrim where the
     blur cannot be seen at all — but is still recomputed on every frame of a
     panel sliding 420px across them, or of a finger dragging one. Dropping it
     for the duration costs nothing visible and takes real work out of exactly
     the frames that were stuttering. */
  useEffect(() => {
    document.documentElement.classList.toggle('has-sheet', sheet !== null)
  }, [sheet])

  /* The dock is the one piece of chrome the keyboard actually fights over.
     It is fixed to the bottom of the screen, which is where the keyboard
     arrives, so it ends up wedged between the keys and the text being typed —
     covering the suggestion chips, and offering to leave the section at the
     one moment nobody wants to. Hiding it while the keyboard is up also gives
     the editor back two rows of screen. */
  const keyboardOpen = useKeyboardOpen()
  useEffect(() => {
    document.documentElement.classList.toggle('has-keyboard', keyboardOpen)
  }, [keyboardOpen])

  /* Below 768px the nav detaches from the bar and docks at the bottom. It has
     to leave the bar's subtree to do it — see useDockDetached. */
  const dockDetached = useDockDetached()

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

  /* Build the sections nobody has opened yet, once the thread has nothing
     better to do.
   *
     Keeping sections alive fixes every visit but the first, and the first is
     still the one that costs — 183ms of it at 4x throttle for Patro. Doing
     that work in an idle callback moves it out of the frame where it is being
     waited on and into one where nothing is happening; the sections mount
     hidden, so it is the React and DOM half only, with layout still deferred
     to whenever they are actually shown.
   *
     Deliberately no timeout on the callback. A timeout is a promise to run
     the work whether the thread is idle or not, which is exactly the thing
     this is avoiding — better to leave a section un-warmed than to build one
     over somebody's typing. Engines without requestIdleCallback (Safari below
     17) simply keep the lazy behaviour.
   *
     saveData is honoured for the same reason prefetch.ts honours it: mounting
     Patro starts its month fetch, and someone who has asked their phone to
     spend less data has not asked for a screen they may never open. */
  useEffect(() => {
    if (booting || visited.length === TAB_ORDER.length) return
    const idle = window.requestIdleCallback
    if (!idle) return
    const conn = (navigator as { connection?: { saveData?: boolean } }).connection
    if (conn?.saveData) return
    const id = idle(() => setVisited([...TAB_ORDER]))
    return () => window.cancelIdleCallback?.(id)
  }, [booting, visited])

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

          On a phone it detaches in the DOM as well, into the portal below.
          A dock that is `position: fixed` inside this bar is a standing trap:
          any of backdrop-filter, transform or filter on the bar re-anchors it
          to the header, and .app-bar's view-transition-name made the bar a
          backdrop root, which silently flattened the dock's frost. Keeping
          the two apart is what stops the next property from doing it again.
          .app-bar--is-booting still animates margin-top rather than transform
          for the desktop case, where the nav really is a child of this bar. */}
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
          {!dockDetached && <TabSwitcher active={tab} onChange={goToTab} />}
          <div className="app-bar__actions">
            <InstallButton />
            {/* One icon, not two. About moved to a row at the bottom of
                Settings — it is read once, and a phone bar carrying a gear and
                an ⓘ side by side spends a lot of chrome saying so. */}
            <SettingsButton onClick={() => openSheet('settings')} />
          </div>
        </div>
      </header>
      <div className={`page${booting ? ' page--is-booting' : ''}`}>
        {visited.includes('type') && (
          <Section active={tab === 'type'}>
            <TypePage
              cheatOpen={sheet === 'cheatsheet'}
              onOpenCheatSheet={() => openSheet('cheatsheet')}
              onCloseCheatSheet={closeSheet}
            />
          </Section>
        )}
        {visited.includes('translate') && (
          <Section active={tab === 'translate'}>
            <TranslatePage t={translateState} />
          </Section>
        )}
        {visited.includes('calendar') && (
          <Section active={tab === 'calendar'}>
            <CalendarPage />
          </Section>
        )}
      </div>

      {/* The phone dock, parented to <body> rather than to the bar. Rendered
          through a portal so it stays the same element and the same single
          role="tablist" as the desktop segmented control — see
          useDockDetached for why it cannot simply stay where it is. */}
      {dockDetached &&
        createPortal(
          <TabSwitcher active={tab} onChange={goToTab} booting={booting} />,
          document.body,
        )}

      {/* One screen, two panes, and About is the second one — not a second
          dialog. Both stay mounted for the whole visit, so going back from
          About is a slide rather than a teardown and a rebuild: see Screen.tsx.
          The order here is the order of the stack, and `depth` is just where
          history says the user currently is in it. */}
      <Screen
        open={sheet === 'settings' || sheet === 'about'}
        depth={sheet === 'about' ? 1 : 0}
        labelledBy={sheet === 'about' ? 'about-title' : 'settings-title'}
        onDismiss={closeSheet}
      >
        <SettingsScreen
          open={sheet === 'settings' || sheet === 'about'}
          onDismiss={closeSheet}
          onOpenAbout={() => openSheet('about', { stack: true })}
        />
        <AboutScreen onDismiss={closeSheet} onGoTo={goToTab} />
      </Screen>

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
