import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'

/* Android's Back button, which the app was not handling at all.
 *
 * Capacitor 8's core Android runtime contains no back handling whatsoever —
 * no onBackPressed, no OnBackInvokedCallback, no canGoBack. All of it lives in
 * @capacitor/app, which this project did not have. So the activity simply
 * finished: Back from Patro quit the app instead of returning to Type, and
 * Back with a sheet open quit instead of closing it. The whole history model
 * in useAppNavigation was correct and completely unreachable — verified on an
 * SM-A075F, and unobservable in any browser, where Back is the browser's.
 *
 * A JS listener rather than the plugin's own default, which is not quite
 * right in either direction: with no listener registered it calls goBack()
 * when it can, but when it cannot it still *consumes* the press without
 * finishing, so the app can never be left from its start destination.
 *
 * canGoBack is the WebView's own answer, which is exactly the question:
 * useAppNavigation keeps the stack at home + optionally a tab + optionally a
 * sheet, so "there is history" and "there is something to unwind" are the
 * same fact. popstate does the rest.
 */
export function installNativeBackHandler(): void {
  try {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('App')) return
    void App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back()
      else void App.exitApp()
    })
  } catch {
    // No bridge, or an APK older than the plugin — Back keeps whatever
    // behaviour that build already had.
  }
}
