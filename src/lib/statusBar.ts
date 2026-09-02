import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

/* The status bar's icons, which the app had no way to reach.
 *
 * applyTheme() writes the <meta name="theme-color"> tag, and in an installed
 * PWA Chrome reads that and colours the bar. The Capacitor WebView does not:
 * it is not Chrome's UI, it is this app's window, so the tag is inert there
 * and the clock and battery icons stayed dark on the dark theme's blue-black
 * bar — the one part of the screen that did not follow the theme.
 *
 * Style names the *background* the icons have to sit on, not the icons: Dark
 * means "dark surface", which is what produces light icons. The bar itself is
 * left transparent and overlaid, which it already was — that is what
 * env(safe-area-inset-top) in App.css is padding around.
 */
export function syncStatusBar(resolved: 'light' | 'dark'): void {
  try {
    /* isPluginAvailable as well as isNativePlatform: an APK older than this
       plugin, running against the newer site, would otherwise reject into
       nothing. There it keeps the bar it always had. */
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('StatusBar')) return
    void StatusBar.setStyle({ style: resolved === 'dark' ? Style.Dark : Style.Light }).catch(() => {
      // The bar is cosmetic — never worth failing a theme change over.
    })
  } catch {
    // No bridge at all.
  }
}
