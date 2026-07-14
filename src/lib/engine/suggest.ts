import { convert } from './convert'
import { DICT } from './dict'
import { VARIANTS } from './variants'
import type { Chip } from './types'

// Prefix completions rank by key length (closest completion first), then
// alphabetically for stability. Sorted once at module load.
const SORTED_KEYS = Object.keys(DICT).sort(
  (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0),
)

// Chip ranking: (1) the deterministic convert() result — always primary,
// always exactly what a space-commit will produce; (2) curated variants for
// ambiguous romanizations; (3) dictionary prefix completions, skipped for
// single letters where a 700-key dict makes them pure noise. Capped at 5,
// deduped by Devanagari text.
export function suggest(pending: string): Chip[] {
  if (!pending) return []
  const seen = new Set<string>()
  const result: Chip[] = []
  const push = (text: string, primary: boolean) => {
    if (result.length >= 5 || seen.has(text)) return
    seen.add(text)
    result.push({ text, primary })
  }

  push(convert(pending), true)
  const lower = pending.toLowerCase()
  for (const variant of VARIANTS[lower] ?? []) push(variant, false)
  if (lower.length >= 2) {
    for (const key of SORTED_KEYS) {
      if (result.length >= 5) break
      if (key.startsWith(lower) && key !== lower) push(DICT[key], false)
    }
  }
  return result
}
