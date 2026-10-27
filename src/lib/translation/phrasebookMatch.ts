import { PHRASE_GROUPS } from '../../data/phrases'

/* The phrasebook, answering first for the exact phrases it already has.
 *
 * Its lines are written by hand and checked (see data/phrases.ts), so for
 * "Thank you" it is a better answer than any service — and a dependable one:
 * on 2026-10-28, with Google rate-limiting the network, the MyMemory fallback
 * answered "Thank you" with "Gurung" and left "Good morning" in English.
 * Exact matches only, after the forgiving normalisation below; anything else
 * goes to the translator as before.
 *
 * Alternatives are paired with care. "Yes / No" ↔ "हो / होइन" splits one to
 * one; "Hello / Goodbye" ↔ "नमस्ते" is one Nepali word for both, so both
 * English halves map to it. Lines with a blank to fill ("My name is …") are
 * left out: they are templates, not translations. */

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[\s।.!?,]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim()

const split = (s: string) => s.split(' / ').map((p) => p.trim())

const EN_TO_NE = new Map<string, string>()
const NE_TO_EN = new Map<string, string>()
for (const group of PHRASE_GROUPS) {
  for (const { en, ne } of group.phrases) {
    if (en.includes('…') || ne.includes('…')) continue
    const ens = split(en)
    const nes = split(ne)
    if (ens.length === nes.length) {
      ens.forEach((e, i) => {
        EN_TO_NE.set(norm(e), nes[i])
        NE_TO_EN.set(norm(nes[i]), e)
      })
    } else if (nes.length === 1) {
      for (const e of ens) EN_TO_NE.set(norm(e), ne)
      NE_TO_EN.set(norm(ne), en)
    }
  }
}

/** The phrasebook's line for exactly this text, or null. */
export function phrasebookMatch(text: string, source: 'en' | 'ne'): string | null {
  const key = norm(text)
  if (!key) return null
  return (source === 'en' ? EN_TO_NE : NE_TO_EN).get(key) ?? null
}
