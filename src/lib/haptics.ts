// navigator.vibrate is unsupported on iOS Safari and can throw in some
// embedded/webview contexts — always optional-chained and wrapped, since a
// haptic tick is a nicety and never worth failing the interaction it
// accompanies.
export function tick(ms = 10) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Ignored — see above.
  }
}
