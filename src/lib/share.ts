import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { isNativeApp } from './androidApp'

/* Two share mechanisms, because the Android WebView has none of its own.
 *
 * navigator.share is a Chrome feature, not a WebView one — inside the APK it
 * is simply undefined, so the share buttons silently never rendered there.
 * The installed app could not do the one thing the website could. Capacitor's
 * Share plugin is the native intent underneath the same idea.
 *
 * isPluginAvailable, and not merely isNativePlatform: capacitor.config.ts
 * points the WebView at the live site, so THIS code runs inside APKs that
 * were built before the plugin existed. Checking only "is this the app" put a
 * share button in front of every Play user on the old build and had it fail
 * on tap — caught on a real SM-A075F, and invisible in every browser. Where
 * the plugin is missing the button simply does not exist, which is exactly
 * where it stood before any of this.
 *
 * Computed once at module load rather than per-render: none of these three
 * answers changes over the life of a page, and all three are synchronous, so
 * every call site can treat this as the constant it always was. */
const NATIVE_SHARE = isNativeApp() && Capacitor.isPluginAvailable('Share')

export const SHARE_AVAILABLE =
  (typeof navigator !== 'undefined' && typeof navigator.share === 'function') || NATIVE_SHARE

/* The user dismissing the sheet is not a failure worth surfacing, unlike every
 * other rejection here. The web API says so with AbortError; the native plugin
 * reports the cancelled chooser as a plain message, so it has to be matched on
 * text. Anything else is rethrown for the caller to show. */
function isDismissal(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') return true
  const message = err instanceof Error ? err.message : String(err)
  return /cancel/i.test(message)
}

export async function shareText(text: string): Promise<void> {
  try {
    if (NATIVE_SHARE) await Share.share({ text })
    else await navigator.share({ text })
  } catch (err) {
    if (isDismissal(err)) return
    throw err
  }
}

/** Hand a file to the system share sheet. Native only — see download.ts. */
export async function shareFile(uri: string, title: string): Promise<void> {
  try {
    await Share.share({ title, files: [uri] })
  } catch (err) {
    if (isDismissal(err)) return
    throw err
  }
}
