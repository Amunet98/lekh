/* Which kind of input was used last, on <html data-input="pointer|keyboard">.
 *
 * For one job: a native <select>'s focus ring. Android's WebView treats the
 * focus a select gets back after its own picker closes as :focus-visible, so a
 * "keyboard-only" ring stayed lit on the Money chip and the date selects after
 * every tap-and-pick (owner, 1.9.99; :focus-within had done the same). Those
 * rings key off this attribute as well, so they show only when a key was the
 * last thing pressed. Text fields keep their rings either way: there, focus
 * is where you type.
 *
 * Capture phase, so nothing can swallow the event before it is seen. */
export function trackInputModality(): void {
  const root = document.documentElement
  const set = (kind: 'pointer' | 'keyboard') => {
    if (root.dataset.input !== kind) root.dataset.input = kind
  }
  window.addEventListener('pointerdown', () => set('pointer'), { capture: true, passive: true })
  window.addEventListener(
    'keydown',
    (e) => {
      // A soft keyboard typing into a field is not keyboard navigation.
      if (e.key === 'Tab' || e.key.startsWith('Arrow') || e.key === 'Enter' || e.key === ' ') set('keyboard')
    },
    { capture: true },
  )
}
