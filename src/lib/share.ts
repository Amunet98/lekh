// Computed once at module load rather than per-render — navigator.share
// support doesn't change over the life of a page, so every call site treats
// this as a constant rather than re-detecting on every render.
export const SHARE_AVAILABLE = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

export async function shareText(text: string): Promise<void> {
  try {
    await navigator.share({ text })
  } catch (err) {
    // The user dismissing the native share sheet throws AbortError — that's
    // not a failure worth surfacing, unlike every other rejection here.
    if (err instanceof DOMException && err.name === 'AbortError') return
    throw err
  }
}
