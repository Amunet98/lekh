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
export const APK_URL =
  'https://github.com/Amunet98/lekh/releases/latest/download/lekh-patro.apk'

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
