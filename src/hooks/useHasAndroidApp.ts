import { isNativeApp } from '../lib/androidApp'

/**
 * True when there is no point offering the Android app: we are already
 * running inside it. Capacitor.isNativePlatform() is synchronous and
 * reliable, so unlike the old TWA-era version of this hook there is no
 * async upgrade to wait on — the answer is never wrong at the first render.
 */
export function useHasAndroidApp(): boolean {
  return isNativeApp()
}
