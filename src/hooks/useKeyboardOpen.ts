import { useEffect, useState } from 'react'

/* Is the on-screen keyboard covering the bottom of the screen?
 *
 * There is no API that answers this. @capacitor/keyboard would answer it
 * natively, but it is a plugin: it would only work in a build new enough to
 * contain it, and this app ships web fixes to every installed copy through
 * server.url within minutes while a new APK takes days to reach anyone. So
 * this is deliberately web-only, and works in a browser tab too.
 *
 * Two signals, and it takes both.
 *
 * 1. The viewport lost height. Which measurement moves depends on the engine:
 *    with the default `interactive-widget: resizes-visual` the layout viewport
 *    keeps its height and only visualViewport shrinks, while an Android
 *    WebView in adjustResize resizes the window itself, so *both* shrink and
 *    a straight clientHeight-minus-visualViewport comparison reads zero.
 *    Remembering the tallest layout height seen covers both: it stays tall in
 *    the second case, where clientHeight does not.
 *
 * 2. Something editable has focus. The height test alone is not enough — a
 *    desktop window resize or a browser hiding its URL bar also lose height —
 *    and focus alone is not enough either, because Android's Back closes the
 *    keyboard while leaving the field focused, which would strand the dock
 *    off-screen. Requiring both is what makes each one's failure harmless.
 *
 * The baseline restarts on a width change, because a rotation legitimately
 * changes what "full height" means. */

/** Below this, it is a URL bar or a toolbar, not a keyboard. */
const MIN_INSET = 140

const NON_TEXT_INPUTS = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
])

function opensKeyboard(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  if (el.tagName === 'TEXTAREA') return true
  if (el.tagName !== 'INPUT') return false
  return !NON_TEXT_INPUTS.has((el as HTMLInputElement).type)
}

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const vv = window.visualViewport
    // No visualViewport means no way to tell, and a dock that never hides is
    // a much smaller problem than one that hides when it should not.
    if (!vv) return

    let tallest = 0
    let width = vv.width

    const update = () => {
      if (vv.width !== width) {
        width = vv.width
        tallest = 0
      }
      const layout = document.documentElement.clientHeight
      if (layout > tallest) tallest = layout
      const inset = Math.max(tallest, layout) - vv.height
      setOpen(inset > MIN_INSET && opensKeyboard(document.activeElement))
    }

    update()
    vv.addEventListener('resize', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      vv.removeEventListener('resize', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])

  return open
}
