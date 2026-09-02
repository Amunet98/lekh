import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Tab } from '../components/TabSwitcher'
import { getPref, setPref } from '../lib/prefs'

/* Back, behaving the way Back behaves in an app.
 *
 * Every section used to sit at the same history entry (replaceState), which
 * made the address bar honest and the Back button useless: inside the Android
 * app, Back quit from any tab, and with a sheet open it quit *instead of
 * closing the sheet*. The rule everywhere else on the platform is that Back
 * unwinds one thing at a time and only leaves once there is nothing left to
 * unwind.
 *
 * The original comment against pushState — that Back would then walk through
 * every tab the user had ever touched — was right about that scheme, and this
 * one is not that scheme. The stack is bounded at three entries and the shape
 * is an invariant, not an accident:
 *
 *     [ home (Type) ]  [ a non-home tab ]?  [ an open sheet ]?
 *
 * A tab is not a place you accumulate. Moving between two non-home tabs
 * replaces rather than pushes, and returning to Type pops rather than pushes,
 * so the stack can never grow past those three no matter how long someone
 * plays with the dock. What Back therefore does, in order: close the sheet,
 * return to Type, leave. Which is the whole point.
 *
 * ?tab= stays exactly as it was — a real, linkable URL per section, which the
 * manifest shortcuts, the native long-press shortcuts and the widget's deep
 * link all depend on.
 *
 * Every tab change is also routed through the View Transitions API, in one
 * place, which is the reason this hook owns the setState rather than handing
 * it out: the section swap used to be an instant ternary in App, and an
 * instant swap is the single loudest "this is a web page" tell in the whole
 * interface. See the ::view-transition rules in App.css for what actually
 * moves. Unsupported engines and reduced-motion users fall through to exactly
 * the old behaviour.
 */

export type Sheet = 'about' | 'settings' | 'cheatsheet'

export const TAB_ORDER: Tab[] = ['type', 'translate', 'calendar']

/** The start destination. Back from anywhere lands here before it exits. */
const HOME: Tab = 'type'

interface NavState {
  tab: Tab
  sheet: Sheet | null
}

function isTab(value: unknown): value is Tab {
  return typeof value === 'string' && (TAB_ORDER as string[]).includes(value)
}

export function tabFromUrl(): Tab {
  try {
    const value = new URLSearchParams(location.search).get('tab')
    return isTab(value) ? value : HOME
  } catch {
    return HOME
  }
}

/* Where a cold launch lands. An explicit ?tab= always wins — that is a widget
   deep link or a launcher shortcut, which is someone asking for a specific
   screen right now and outranks a standing preference. */
function landingTab(): Tab {
  const fromUrl = tabFromUrl()
  if (fromUrl !== HOME) return fromUrl
  return getPref('restoreLastTab') ? getPref('lastTab') : HOME
}

function urlForTab(tab: Tab): string {
  const url = new URL(location.href)
  if (tab === HOME) url.searchParams.delete('tab')
  else url.searchParams.set('tab', tab)
  return url.href
}

/* history.state is the source of truth for *where the stack is*, deliberately
   read fresh at every call rather than mirrored in a ref. A hardware Back has
   already moved it by the time React hears about anything, and a ref would be
   describing the entry before last. */
function readState(): NavState {
  try {
    const stored = (history.state as { lekh?: Partial<NavState> } | null)?.lekh
    if (stored && isTab(stored.tab)) return { tab: stored.tab, sheet: stored.sheet ?? null }
  } catch {
    // Restricted context — fall through to the URL, which is always readable.
  }
  return { tab: tabFromUrl(), sheet: null }
}

function write(next: NavState, mode: 'push' | 'replace') {
  try {
    const url = urlForTab(next.tab)
    if (mode === 'push') history.pushState({ lekh: next }, '', url)
    else history.replaceState({ lekh: next }, '', url)
  } catch {
    // Non-browser or restricted context — the view still switches, the URL
    // just doesn't follow. Never worth throwing over.
  }
}

/* Direction is the whole point of doing this by hand rather than letting the
   default cross-fade run: moving right through the dock should look like
   moving right. The attribute is read by the ::view-transition keyframes and
   set before the snapshot is taken. */
function setDirection(from: Tab, to: Tab) {
  const forward = TAB_ORDER.indexOf(to) > TAB_ORDER.indexOf(from)
  document.documentElement.dataset.navDir = forward ? 'forward' : 'back'
}

function prefersReducedMotion(): boolean {
  try {
    return matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function useAppNavigation() {
  const [tab, setTab] = useState<Tab>(landingTab)
  /* Where each section was left. The document scrolls (not .page), and
     switching away and back used to dump you at whatever offset the previous
     section happened to be at — halfway down the calendar after coming back
     from Type, or at the top of a translation you were reading the end of.
     Sections keeping their place is one of the quieter things that separates
     an app from a page. */
  const scrollByTab = useRef<Partial<Record<Tab, number>>>({})
  const tabRef = useRef(tab)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  /* A tab change asked for while a sheet is open cannot be done in one step:
     the sheet's entry has to come off first, and history.back() only reports
     back asynchronously through popstate. This is the "and then go here" note
     the popstate handler picks up. Only the About sheet's section buttons can
     reach it — the dock itself is inert behind a modal dialog. */
  const pendingTab = useRef<Tab | null>(null)

  /* Seed the stack so home is always underneath. Without this, an app opened
     straight into Patro — the widget's deep link, or a launcher shortcut —
     has no entry below it, and Back exits from a screen the user never chose
     to be on first. Android synthesises a parent stack for exactly this case;
     this is the same courtesy, two lines of it. */
  useEffect(() => {
    /* The browser restores the scroll position of the entry it navigates back
       to, and it does so *before* popstate fires — so tapping Type in the dock
       (which is a history.back()) scrolled the page to the home entry's
       remembered offset, and the handler then recorded that as where the user
       had left Patro. Every section's saved position quietly became ~0.
       Sections keep their own scroll here, per tab and not per history entry,
       which is the app behaviour; the browser's version is the page one. */
    try {
      history.scrollRestoration = 'manual'
    } catch {
      // Not supported — the per-tab map still works going forward, and the
      // browser's own restoration is a reasonable thing to be stuck with.
    }
    const landed = landingTab()
    write({ tab: HOME, sheet: null }, 'replace')
    if (landed !== HOME) write({ tab: landed, sheet: null }, 'push')
  }, [])

  /* Recorded unconditionally, whether or not "open where I left off" is on —
     otherwise switching the setting on only starts working after the next
     section change, which reads as the setting being broken. */
  useEffect(() => {
    setPref('lastTab', tab)
  }, [tab])

  /* One door for every tab change — the dock, Alt+digit, the About sheet's
     section buttons, and a hardware Back all arrive here. */
  const applyTab = useCallback((next: Tab) => {
    const current = tabRef.current
    if (current === next) return
    scrollByTab.current[current] = window.scrollY
    setDirection(current, next)
    tabRef.current = next
    setTab(next)
  }, [])

  /* Straight after the DOM has the new section in it — inside the view
     transition's callback, where the old frame is still on screen, so the
     jump is never seen. */
  const restoreScroll = useCallback((next: Tab) => {
    window.scrollTo(0, scrollByTab.current[next] ?? 0)
  }, [])

  const transitionToTab = useCallback(
    (next: Tab) => {
      /* Nothing is moving, so nothing should animate. popstate fires for sheet
         opens and closes too, and those arrive here with the tab unchanged —
         applyTab correctly did nothing, but the transition had already been
         started, so the whole page was snapshotted and slid 16px against an
         identical copy of itself. That is the flicker on closing a sheet. */
      if (next === tabRef.current) return
      const start = document.startViewTransition?.bind(document)
      if (!start || prefersReducedMotion()) {
        /* flushSync here too, and it is not decoration: restoreScroll has to
           run against the section it is restoring. Without it setTab was
           still pending, the scroll landed on the *outgoing* screen, and a
           short one clamped it to nearly zero — so the saved offset was
           thrown away every time by the very code meant to honour it. */
        flushSync(() => applyTab(next))
        restoreScroll(next)
        return
      }
      /* startViewTransition takes the "before" snapshot synchronously, runs
         the callback, then takes the "after" one — so the state change has to
         happen inside it and React has to have flushed by the time it
         returns. flushSync is what guarantees that; without it the callback
         resolves before the re-render and both snapshots are the old screen. */
      const transition = start(() => {
        flushSync(() => applyTab(next))
        restoreScroll(next)
      })
      /* A transition started while another is still running is *skipped*, and
         the browser reports that by rejecting these promises. Tapping through
         the dock quickly is an ordinary thing to do and the DOM update still
         happened — the animation is the only casualty — so this is swallowed
         rather than surfaced. Unhandled, it reached window.onerror as
         "Transition was skipped". */
      void transition.ready.catch(() => {})
      void transition.finished.catch(() => {})
    },
    [applyTab, restoreScroll],
  )

  const goToTab = useCallback((next: Tab) => {
    const current = readState()

    if (current.sheet !== null) {
      pendingTab.current = next
      history.back()
      return
    }
    if (next === current.tab) return

    if (next === HOME) {
      /* Pop, don't replace. The entry below a non-home tab is home — that is
         the invariant this whole hook maintains — so going back *is* going to
         Type, and it keeps the stack from silently stranding an entry that
         Back would later have to spend a press on. popstate does the setTab. */
      history.back()
      return
    }
    write({ tab: next, sheet: null }, current.tab === HOME ? 'push' : 'replace')
    transitionToTab(next)
  }, [transitionToTab])

  const openSheet = useCallback((name: Sheet) => {
    const current = readState()
    write({ tab: current.tab, sheet: name }, current.sheet === null ? 'push' : 'replace')
    setSheet(name)
  }, [])

  /* Ask history to go back and let popstate clear the state — deliberately
     NOT setSheet(null) here as well.
   *
   * Doing both was a real bug, reported in Brave and Firefox and reproducible
   * in Chromium at phone width. Clearing the state re-rendered the tree, the
   * effect in Sheet called <dialog>.close(), the element fired its own close
   * event, and that calls straight back into here — while history.back(), which
   * is asynchronous, had not landed yet. So the guard below still saw the sheet
   * entry and popped a SECOND time. Two pops from a sheet on a non-home tab
   * land on Type ("it goes back to Type instead of the tab I'm on"); two pops
   * from a sheet on Type leave the app entirely ("it closes the whole
   * website"). Which of the two you got depended on engine timing, which is
   * why it looked like two different bugs.
   *
   * With state changing only on popstate, every re-entry — the close event,
   * Escape, the backdrop, the grabber's fling, Android's Back — finds history
   * and state already in agreement, and the guard does what it was written
   * for rather than being outrun. */
  const closeSheet = useCallback(() => {
    if (readState().sheet !== null) {
      history.back()
      return
    }
    // Already popped (a hardware Back, or the second call described above).
    setSheet(null)
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const state = readState()
      setSheet(state.sheet)
      transitionToTab(state.tab)
      const wanted = pendingTab.current
      if (wanted !== null) {
        pendingTab.current = null
        goToTab(wanted)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [goToTab, transitionToTab])

  return { tab, goToTab, sheet, openSheet, closeSheet }
}
