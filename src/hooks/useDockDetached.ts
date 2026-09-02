import { useEffect, useState } from 'react'

/* Is the section nav a bottom dock rather than a segment in the app bar?
 *
 * This duplicates one number that also lives in TabSwitcher.css, which is a
 * real cost, so it is worth being clear about why the switch cannot be done
 * in CSS alone: below this width the nav is `position: fixed` at the bottom
 * of the screen, and it must not be a DOM descendant of .app-bar while it is.
 *
 * .app-bar carries a view-transition-name (see the section-transition block
 * in App.css). A named element is a *backdrop root*, which flattens
 * backdrop-filter everywhere inside it — the dock's own frost included. No
 * amount of styling reaches that; only moving the element out of the bar's
 * subtree does, which is a DOM question and therefore a React one.
 *
 * Above this width the nav goes back inside the bar, where it is an ordinary
 * flex child of .app-bar__inner and sits between the wordmark and the
 * actions. It is the same element and the same single role="tablist" either
 * way — it changes parents, it is not rendered twice.
 *
 * If you change this number, change it in TabSwitcher.css too. */
export const DOCK_QUERY = '(max-width: 767px)'

export function useDockDetached(): boolean {
  const [detached, setDetached] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DOCK_QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(DOCK_QUERY)
    const update = () => setDetached(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return detached
}
