import { useEffect, useState } from 'react'
import { isAndroidAppInstalled, isTWA } from '../lib/androidApp'

/**
 * True when there is no point offering the Android app: either we are already
 * running inside it, or the browser says the package is installed.
 *
 * The synchronous seed checks `isTWA()`, not `isStandalone()` — standalone is
 * also true for a plain Chrome-menu PWA install, which has no widget and is
 * exactly the case that should still be offered the APK.
 *
 * Starts false and flips once the browser answers. That order matters — the
 * question is asynchronous and Chrome-only, so starting true would flash the
 * install affordance off for everyone else, which is worse than briefly
 * showing it to the small set of people who already have the app.
 */
export function useHasAndroidApp(): boolean {
  const [installed, setInstalled] = useState(() => isTWA())

  useEffect(() => {
    let alive = true
    void isAndroidAppInstalled().then((yes) => {
      if (alive && yes) setInstalled(true)
    })
    return () => {
      alive = false
    }
  }, [])

  return installed
}
