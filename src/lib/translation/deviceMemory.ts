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
 * answer is known without asking. A Safari tab gets far less memory than the
 * phone has, and this load needs a lot at once — transformers.js holds both
 * ~450MB weight files as JS buffers, then onnxruntime copies them into a WASM
 * heap that iOS caps at around a gigabyte. A Reddit user reported the model
 * "isn't being downloaded" on an iPhone (2026-10-12): the tab dies mid-load
 * the way the Galaxy A07's did, and comes back with nothing to show for it.
 * Not reproduced here (no iPhone to hand), but no iPhone ships the headroom,
 * so it is blocked like any other device that can't fit the model. */
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
