/* Which shell the web code is running inside.
 *
 * `server.url` points the WebView at the live site (see capacitor.config.ts),
 * so the version in package.json and the version Play Store shows for the
 * installed app are two different numbers that drift apart within hours of any
 * web-only fix. AboutScreen has always been careful to call its one "web
 * build" for that reason — but a tester reporting a bug against "web build
 * 1.9.22" still leaves the shell unidentified, and the shell is the half that
 * only moves on an upload and can hold a native bug.
 *
 * @capacitor/app was already a dependency (nativeBack.ts needs it for the Back
 * button); getInfo was simply never called.
 */
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

export interface NativeInfo {
  /** Matches the versionName Play Store shows, e.g. "1.9.19". */
  version: string
  /** The versionCode, e.g. "1009019" — what identifies the upload. */
  build: string
}

/* Read once and cached, so render can stay synchronous. undefined means "not
   asked yet", null means "asked, and there is no native shell".
 *
 * A store rather than a plain variable, because the answer arrives over the
 * Capacitor bridge — asynchronously — and the two places that show it are
 * mounted before it lands. Settings in particular is mounted for the whole
 * visit (the panes are keep-alive, see Screen.tsx), so a bare cache would be
 * read once during boot, come back empty, and never be read again: the app
 * version would be permanently missing from the one screen it belongs on.
 * Same shape as printSheet.ts. */
let cached: NativeInfo | null | undefined
const listeners = new Set<() => void>()

export function subscribeNativeInfo(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/* Gated exactly as nativeBack.ts gates its own plugin call, and for the same
   reason: server.url runs today's web code inside an APK that may be several
   releases old, so a plugin this build assumes can simply not be there. */
export async function loadNativeInfo(): Promise<void> {
  if (cached !== undefined) return
  try {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('App')) {
      cached = null
    } else {
      const info = await App.getInfo()
      cached = { version: info.version, build: info.build }
    }
  } catch {
    // An older shell, or no bridge. The version line falls back to web-only.
    cached = null
  }
  for (const listener of listeners) listener()
}

/** null in a browser, and in any APK too old to answer. */
export function getNativeInfo(): NativeInfo | null {
  return cached ?? null
}
