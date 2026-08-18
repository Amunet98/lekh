import { isStandalone } from './androidApp'

/**
 * "app" once installed to a home screen (any platform) or running inside the
 * Android APK, "browser" otherwise. Copy that describes where the page is
 * running reads wrong for an installed session — there's no address bar in
 * sight to make "browser" the honest word.
 *
 * Not reactive on purpose: display-mode can't change mid-session (you don't
 * toggle it without a full relaunch), so a plain call at render time is
 * enough — same as isAndroid()/useHasAndroidApp() elsewhere in this codebase.
 */
export function runtimeNoun(): 'app' | 'browser' {
  return isStandalone() ? 'app' : 'browser'
}
