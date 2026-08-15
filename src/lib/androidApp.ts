/* The Android build, in one place.
 *
 * The URL lived in AboutSheet and was about to be copied into InstallButton,
 * which is how two copies of a release URL drift apart.
 *
 * Published as a GitHub release asset rather than from public/, deliberately:
 * anything in public/ is both served at the site root and swept into the
 * service worker's precache, so shipping a megabyte of APK to every visitor —
 * including the ones on iPhones who can never use it — to save a redirect is a
 * bad trade. `releases/latest/download` always resolves to the newest release,
 * so this never needs updating. The asset filename must stay `lekh-patro.apk`
 * for that path to resolve.
 */
import { ANDROID_PACKAGE } from './androidPackage'
export { ANDROID_PACKAGE } from './androidPackage'

export const APK_URL =
  'https://github.com/Amunet98/lekh/releases/latest/download/lekh-patro.apk'

/* Not wired up to InstallButton yet — swap APK_URL for this once the Play
 * listing actually clears review. Flipping it earlier would point "Get app"
 * at a store page that 404s, breaking a link that currently works. */
export const PLAY_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`

/** A userAgent test is right here: what decides this is the OS, not the screen. */
export function isAndroid(): boolean {
  try {
    return /Android/i.test(navigator.userAgent)
  } catch {
    return false
  }
}

/**
 * Already running as an installed app — the PWA added to a home screen, or
 * inside the Android APK, which is a Trusted Web Activity and therefore also
 * reports standalone. Either way there is nothing left to offer.
 */
export function isStandalone(): boolean {
  try {
    return matchMedia('(display-mode: standalone)').matches
  } catch {
    return false
  }
}

/**
 * Specifically the Android APK's Trusted Web Activity — not just "installed
 * somehow". `isStandalone()` is also true for the plain PWA that Chrome's own
 * "Install app" menu produces, which has no widget and is exactly the case
 * where the "Get the Android app" offer should still show. A TWA is launched
 * with `document.referrer` set to `android-app://<package>`, which a browser
 * tab or a Chrome-menu PWA install never sets, so it is the one signal that
 * tells the two apart synchronously.
 */
export function isTWA(): boolean {
  try {
    return document.referrer.startsWith('android-app://')
  } catch {
    return false
  }
}

/**
 * Whether the Android APK is installed on this device — asked of the browser,
 * not inferred.
 *
 * `isStandalone()` only answers "am I running inside an installed app right
 * now". It is false when you open lekh in an ordinary Chrome tab on a phone
 * that already has the APK, which is exactly the case where offering to
 * install it again is wrong, and exactly the case the owner hit.
 *
 * getInstalledRelatedApps is the browser's answer to that. It needs both ends
 * of the association: `related_applications` in the web manifest naming the
 * package (vite.config.ts), and the app claiming the site through
 * assetlinks.json — which it already does, because the same file is what
 * removes Chrome's address bar inside the TWA.
 *
 * Chrome-only and Android-only; everywhere else it is simply absent, and the
 * answer is "no" rather than an error.
 */
export async function isAndroidAppInstalled(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<{ id?: string; platform?: string }[]>
    }
    if (typeof nav.getInstalledRelatedApps !== 'function') return false
    const apps = await nav.getInstalledRelatedApps()
    return apps.some((app) => app.id === ANDROID_PACKAGE)
  } catch {
    return false
  }
}
