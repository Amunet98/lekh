import { useMediaQuery } from './useMediaQuery'

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
 * If you change this number, change it in TabSwitcher.css too.
 *
 * It is also the width at which anchored dropdown menus become bottom sheets
 * (see ActionSheet), which is not a coincidence and not a second decision:
 * both are "this is a phone, lay it out like one". Anything else that needs
 * to ask should import this constant rather than retype the number. */
export const DOCK_QUERY = '(max-width: 767px)'

export function useDockDetached(): boolean {
  return useMediaQuery(DOCK_QUERY)
}
