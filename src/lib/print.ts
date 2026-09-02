import { Capacitor, registerPlugin } from '@capacitor/core'

interface PrintPlugin {
  print(options: { name: string }): Promise<void>
}

const Print = registerPlugin<PrintPlugin>('Print')

/* window.print() is a silent no-op in the Android WebView — not an error, just
 * nothing — so "Save as PDF" did nothing at all inside the app. PrintPlugin.java
 * routes the same page through Android's PrintManager, which lays it out for the
 * print medium and therefore honours the print-only sheet and @media print rules
 * the web path already relies on.
 *
 * isPluginAvailable, not just isNativePlatform: an APK older than this plugin
 * running against the newer site would otherwise reject into the void. There it
 * falls through to window.print(), which does nothing — the same as before, and
 * no worse. */
export function printPage(name = 'Lekh Patro'): void {
  try {
    if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Print')) {
      void Print.print({ name })
      return
    }
  } catch {
    // Bridge missing or misbehaving — fall through to the browser's own.
  }
  window.print()
}
