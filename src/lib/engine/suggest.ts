import { convert } from './convert'
import { DICT } from './dict'
import { VARIANTS } from './variants'
import type { Chip } from './types'
import { wikiMatches } from './wiki'

// Prefix completions rank by key length (closest completion first), then
// alphabetically for stability. Sorted once at module load.
const SORTED_KEYS = Object.keys(DICT).sort(
  (a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0),
)

// Chip ranking: (1) the deterministic convert() result — always primary,
// always exactly what a space-commit will produce; (2) curated variants for
// ambiguous romanizations; (3) up to two Nepali Wikipedia words that sound the
// same as what was typed, a loose spelling of a real word ("sarkar" → सरकार;
// see wiki.ts); (4) Lekh's own dictionary completions, skipped for single
// letters where they are pure noise; (5) Wikipedia completions, from three
// letters on. Lekh's words stay ahead of Wikipedia's except for (3), where
// the typed spelling is simply not a word. Capped at 5, deduped by text.
export function suggest(pending: string): Chip[] {
  if (!pending) return []
  const seen = new Set<string>()
  const result: Chip[] = []
  const push = (text: string, primary: boolean) => {
    if (result.length >= 5 || seen.has(text)) return
    seen.add(text)
    result.push({ text, primary })
  }

  const converted = convert(pending)
  push(converted, true)
  const lower = pending.toLowerCase()
  for (const variant of VARIANTS[lower] ?? []) push(variant, false)
  const wiki = lower.length >= 2 ? wikiMatches(converted, { same: 2, longer: 5 }) : { same: [], longer: [] }
  for (const word of wiki.same) push(word, false)
  if (lower.length >= 2) {
    for (const key of SORTED_KEYS) {
      if (result.length >= 5) break
      if (key.startsWith(lower) && key !== lower) push(DICT[key], false)
    }
  }
  if (lower.length >= 3) for (const word of wiki.longer) push(word, false)
  return result
}
