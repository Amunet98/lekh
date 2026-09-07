import { useEffect, useState } from 'react'

/* Does a media query match right now?
 *
 * Extracted from useDockDetached, which had been the only thing in the app
 * that needed to know about a breakpoint in JavaScript rather than in CSS. It
 * is not any more — the phone action sheets (see ActionSheet) have to choose
 * between two different *elements*, not two different sets of styles, and
 * that is a render-time decision.
 *
 * The initial value is read synchronously rather than left false until an
 * effect runs. Starting wrong and correcting after the first paint is a
 * visible flash of the desktop layout on a phone, and for the dock it was
 * worse than a flash: the nav would mount inside the app bar and then move to
 * a portal, remounting the whole tablist a frame later.
 *
 * The `typeof window` guard is for a non-DOM render (the cheat-sheet check
 * script builds with --ssr, see package.json), where matchMedia does not
 * exist and asking for it throws.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    // Once on mount as well as on change: between the useState initialiser
    // above and this effect running, the window can already have been
    // resized, and a MediaQueryList only reports changes from here on.
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])

  return matches
}
