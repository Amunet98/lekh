/* Three taps, and only three.
 *
 * A phone app answers a touch with something you feel, and this one answered
 * exactly one gesture out of the whole interface — picking a suggestion chip.
 * Everything else was silent, which is most of what "it doesn't feel like an
 * app" turns out to mean in practice.
 *
 * The vocabulary is kept deliberately small, because a haptic that fires for
 * everything stops meaning anything:
 *
 *   tick    — you selected something (a chip, a tab, a day, a glyph)
 *   confirm — the thing you asked for is done (copied, shared, saved)
 *   warn    — it isn't, and you need to know (failed, offline)
 *
 * navigator.vibrate is unsupported on iOS Safari and can throw in some
 * embedded/webview contexts — always optional-chained and wrapped, since a
 * haptic is a nicety and never worth failing the interaction it accompanies.
 * It is a real motor on Android, which is where the app is installed.
 */

/* Off is a setting, not a guess — see the haptics switch in SettingsSheet.
 * Module-level rather than threaded through every call site: this is a device
 * property, there is one device, and every caller wants the same answer. */
let enabled = true

export function setHapticsEnabled(next: boolean) {
  enabled = next
}

function buzz(pattern: number | number[]) {
  if (!enabled) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // Ignored — see above.
  }
}

/** A selection landed. The lightest thing the motor can do. */
export function tick() {
  buzz(10)
}

/** Done — a double beat, so it is distinguishable from a tick by feel alone. */
export function confirm() {
  buzz([12, 45, 16])
}

/** Something failed. One longer pulse; nothing that reads as an alarm. */
export function warn() {
  buzz(32)
}
