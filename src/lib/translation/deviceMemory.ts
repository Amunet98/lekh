/* navigator.deviceMemory only exists on Chromium — Safari and Firefox never
 * implemented it — and even there it's a *bucketed* approximation (0.25, 0.5,
 * 1, 2, 4, 8 GiB), not the real figure, rounded up to the nearest bucket.
 * Confirmed on a real budget device (Samsung Galaxy A07, ~3.6GB actual RAM):
 * it reports 4, the same value a genuinely comfortable 6GB phone would also
 * report. That coarseness is why 'low' and 'warn' are split where they are —
 * 4 can't be trusted as "fine" (this exact device crashed on-device
 * translation outright, mid model-load, while offline and even for a single
 * word), so it gets a warning rather than a silent pass; only 8 is treated as
 * comfortable headroom for the model's ~900MB WASM heap.
 *
 * Undefined (unsupported browser) is treated as 'ok' — there's no signal to
 * act on, and blocking or warning every non-Chromium visitor over a metric
 * they can't report would be worse than saying nothing. */
export type MemoryTier = 'low' | 'warn' | 'ok'

export function memoryTier(): MemoryTier {
  const mem = (navigator as { deviceMemory?: number }).deviceMemory
  if (mem === undefined) return 'ok'
  if (mem < 4) return 'low'
  if (mem < 8) return 'warn'
  return 'ok'
}
