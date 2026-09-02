import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { Tab } from '../components/TabSwitcher'

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

export type Sheet = 'about' | 'cheatsheet'

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
  const [tab, setTab] = useState<Tab>(tabFromUrl)
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
    const landed = tabFromUrl()
    write({ tab: HOME, sheet: null }, 'replace')
    if (landed !== HOME) write({ tab: landed, sheet: null }, 'push')
  }, [])

  /* One door for every tab change — the dock, Alt+digit, the About sheet's
     section buttons, and a hardware Back all arrive here. */
  const applyTab = useCallback((next: Tab) => {
    setTab((current) => {
      if (current === next) return current
      setDirection(current, next)
      return next
    })
  }, [])

  const transitionToTab = useCallback(
    (next: Tab) => {
      const start = document.startViewTransition?.bind(document)
      if (!start || prefersReducedMotion()) {
        applyTab(next)
        return
      }
      /* startViewTransition takes the "before" snapshot synchronously, runs
         the callback, then takes the "after" one — so the state change has to
         happen inside it and React has to have flushed by the time it
         returns. flushSync is what guarantees that; without it the callback
         resolves before the re-render and both snapshots are the old screen. */
      start(() => {
        flushSync(() => applyTab(next))
      })
    },
    [applyTab],
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

  const closeSheet = useCallback(() => {
    setSheet(null)
    /* Only pop if the entry is still ours to pop. A hardware Back has already
       consumed it before <dialog> fires its own close event, and closing that
       way would otherwise pop a second time and take the tab entry with it —
       one press, two screens, which is the bug this guard exists for. */
    if (readState().sheet !== null) history.back()
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
