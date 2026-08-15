/*
 * The ले/ख wordmark, in the one composition that is easy to get wrong.
 *
 * **Devanagari letters are joined.** ले and ख share the शिरोरेखा — the
 * unbroken horizontal bar across the top of a word — so they cannot be split
 * into two inline-blocks, two flex items, or two separately animated elements.
 * Any of those ends the bar at the boundary and renders the mark as two
 * half-words butted together with a visible seam through the headline.
 *
 * That is why the accent colour is applied with a plain inline <span>: an
 * inline box does not interrupt the bar, and a colour change is the only thing
 * being asked for. If you ever want to animate the two halves independently,
 * the answer is that you cannot — animate the whole mark instead.
 *
 * This existed twice, in BootScreen and AboutSheet, each with its own long
 * comment saying the above. The bug was hit and fixed twice in a single
 * changeset because of it, which is the argument for one component: the rule
 * is now stated in exactly one place and cannot be half-remembered.
 *
 * Only the ink span is parameterised — the surrounding size, weight and
 * animation genuinely differ per surface and stay in each one's stylesheet.
 * The app bar uses this too now (2026-08-16, to match Boot/About's split
 * colouring) — it just doesn't animate it, so it was never at risk of the
 * bug either way.
 */
export function LekhMark({ inkClassName }: { inkClassName?: string }) {
  return (
    <>
      ले<span className={inkClassName}>ख</span>
    </>
  )
}
