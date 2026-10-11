/* navigator.deviceMemory only exists on Chromium — Safari and Firefox never
 * implemented it — and even there it's a *bucketed* approximation (0.25, 0.5,
 * 1, 2, 4, 8 GiB), not the real figure, rounded up to the nearest bucket.
 * Confirmed on a real budget device (Samsung Galaxy A07, ~3.6GB actual RAM):
 * it reports 4 — and on-device translation crashed outright on that exact
 * device, mid model-load, while offline and even for a single word. 4 is
 * therefore blocked outright rather than merely warned, on the theory that a
 * device whose *rounded-up* figure is only 4 has no headroom to spare for an
 * ~900MB WASM heap. The 'warn' tier is left in for any intermediate value a
 * future browser might report (Chromium's own bucket set jumps straight from
 * 4 to 8, so it won't fire there today) — only 8 is treated as comfortable
 * headroom.
 *
 * Undefined (unsupported browser) is treated as 'ok' — there's no signal to
 * act on, and blocking or warning every non-Chromium visitor over a metric
 * they can't report would be worse than saying nothing.
 *
 * With one exception: iPhone and iPad, where every browser is WebKit and the
 * answer is known without asking. WebKit cannot load this model inside any
 * memory budget a phone gives a tab. Measured 2026-10-12 in WebKitGTK 2.52 on
 * a 13GB desktop: the ~900MB download finished, the page reached 8.4GB, and
 * WebKit's own memory killer took it down ("Unable to shrink memory footprint
 * of process (8455 MB) below the kill threshold (8192 MB)"). iOS kills a tab
 * far sooner than that, so even on an iPhone 17 Pro Max (12GB, the biggest
 * iPhone there is) a Reddit user saw the download button "do nothing" — most
 * likely the tab dying early and reloading looking just as it had before. */
export type MemoryTier = 'low' | 'warn' | 'ok'

// iPadOS 13+ asks for the desktop site and reports itself as a Mac; the touch
// points are what give it away (no Mac has a touchscreen).
function isAppleMobile(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function memoryTier(): MemoryTier {
  if (isAppleMobile()) return 'low'
  const mem = (navigator as { deviceMemory?: number }).deviceMemory
  if (mem === undefined) return 'ok'
  if (mem <= 4) return 'low'
  if (mem < 8) return 'warn'
  return 'ok'
}
