/* The page Save-as-PDF actually prints, kept in exactly one place.
 *
 * It used to be a `<div id="print-sheet">` rendered by whichever toolbar was
 * doing the printing and filled in imperatively through a ref. Two things went
 * wrong with that on a phone, and neither of them can happen in a browser tab,
 * which is why the feature looked fine for so long:
 *
 * - Type and Translate are both mounted at once, because the sections are
 *   keep-alive. So two elements carried the same id. A CSS id selector matches
 *   every one of them, and the print rules make each `position: absolute;
 *   top: 0` with a white background — so the empty sheet painted straight over
 *   the one holding the text.
 *
 * - `window.print()` is synchronous: the browser lays the page out inside the
 *   call, before React can get a re-render in. Android's PrintManager is not.
 *   It takes its snapshot after `printPage()` has already returned, and by
 *   then the toolbar had re-rendered and replaced the div, taking the text
 *   with it. Measured on the phone: a MutationObserver caught the text being
 *   written, the print dialog opened, and the page came out blank.
 *
 * One element, rendered by App, with its content owned by React instead of
 * written behind React's back. That also retires the awkward rule the old
 * comment had to state and could not enforce — that exactly one caller may
 * render the sheet at a time.
 */
let text = ''
const listeners = new Set<() => void>()

export function setPrintText(next: string): void {
  text = next
  for (const listener of listeners) listener()
}

export function subscribePrintText(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPrintText(): string {
  return text
}
