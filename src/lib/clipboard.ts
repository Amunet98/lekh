import { Capacitor } from '@capacitor/core'
import { Clipboard } from '@capacitor/clipboard'
import { isNativeApp } from './androidApp'

/* Reading the clipboard, for the editor's Paste button.
 *
 * Two mechanisms, for the same reason share.ts has two. Inside the APK the
 * WebView refuses navigator.clipboard.readText outright — permissions.query
 * reports clipboard-read as "denied" and the call rejects with
 * NotAllowedError (probed on the A024 over CDP, 2026-11-01), while writeText
 * works, which is why Copy never needed a plugin. Capacitor's Clipboard
 * plugin reads through the native ClipboardManager instead.
 *
 * isPluginAvailable and not merely isNativeApp: capacitor.config.ts points
 * the WebView at the live site, so this code also runs in APKs built before
 * the plugin was added. There the button must not exist at all — a Paste that
 * fails on every tap is worse than no Paste — and that is exactly what
 * PASTE_AVAILABLE says. Computed once: none of these answers change over the
 * life of a page. */
const NATIVE = isNativeApp()
const NATIVE_PASTE = NATIVE && Capacitor.isPluginAvailable('Clipboard')
const WEB_PASTE =
  !NATIVE && typeof navigator !== 'undefined' && typeof navigator.clipboard?.readText === 'function'

export const PASTE_AVAILABLE = NATIVE_PASTE || WEB_PASTE

/** The clipboard's text, '' when it holds none. Rejects when the read is
 *  refused (a browser permission prompt dismissed or denied). */
export async function readClipboardText(): Promise<string> {
  if (NATIVE_PASTE) {
    let result
    try {
      result = await Clipboard.read()
    } catch (err) {
      /* An empty clipboard is not a failure, but the Android side reports it
         as one: read() rejects with "There is no data on the clipboard". */
      if (/no data/i.test(err instanceof Error ? err.message : String(err))) return ''
      throw err
    }
    /* Images come back as data URLs under an image/* type; only text belongs
       in a text field. */
    return result.type.startsWith('text') ? (result.value ?? '') : ''
  }
  return navigator.clipboard.readText()
}
