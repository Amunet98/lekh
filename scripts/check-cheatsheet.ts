/*
 * Does the cheat sheet still tell the truth about the engine?
 *
 * The cheat sheet's `romanized` labels and the transliteration engine hold the
 * same knowledge in two places, and nothing connects them — change a mapping in
 * src/lib/engine and the sheet will happily keep teaching the old one.
 *
 * The obvious fix is to delete the duplication and derive every label from
 * `convert()`. That does not work, and it is worth writing down why rather than
 * rediscovering it: `romanized` is a *label*, not an input. Some cells offer
 * two spellings ("ph · f"), one describes behaviour rather than a spelling
 * ("auto", for the halant that the engine applies on its own), and one shows
 * the Devanagari danda for a full stop. Deriving would have broken those five
 * and quietly changed what the sheet teaches.
 *
 * So the duplication stays and this asserts it instead: every label that *is* a
 * plain romanization must round-trip through the engine to exactly the glyph
 * the cell inserts. The five that are not are listed here by name, so adding a
 * sixth is a deliberate act rather than an accident.
 *
 * Run: npm run check:cheatsheet
 */
import { convert } from '../src/lib/engine'
import {
  VOWELS,
  CONSONANT_GROUPS,
  SEMIVOWELS_SIBILANTS,
  CONJUNCTS,
  SIGNS_DIGITS,
  COMMON_WORDS,
  DIGIT_CELLS,
} from '../src/data/cheatSheet'

/** Labels that are deliberately not a single romanization. */
const NOT_A_ROMANIZATION = new Set([
  'ph · f', // two accepted spellings for फ
  'w · v', // two accepted spellings for व
  'ksh · x', // two accepted spellings for क्ष
  'auto', // the halant ्, which the engine applies itself
  '.', // shown as the danda ।
])

const groups = [
  VOWELS,
  ...CONSONANT_GROUPS,
  SEMIVOWELS_SIBILANTS,
  CONJUNCTS,
  SIGNS_DIGITS,
  COMMON_WORDS,
  DIGIT_CELLS,
]

let checked = 0
const drifted: string[] = []
const unusedExceptions = new Set(NOT_A_ROMANIZATION)

for (const group of groups) {
  for (const cell of group.cells) {
    if (NOT_A_ROMANIZATION.has(cell.romanized)) {
      unusedExceptions.delete(cell.romanized)
      continue
    }
    checked++
    const derived = convert(cell.romanized)
    if (derived !== cell.insert) {
      drifted.push(
        `  ${group.label}\n    "${cell.romanized}" inserts "${cell.insert}" ` +
          `but the engine converts it to "${derived}"`,
      )
    }
  }
}

if (unusedExceptions.size > 0) {
  // An exception that no longer matches a cell is itself drift: the cell was
  // renamed or removed and the list was not updated.
  drifted.push(
    `  stale exception(s) in NOT_A_ROMANIZATION: ${[...unusedExceptions]
      .map((e) => `"${e}"`)
      .join(', ')}`,
  )
}

if (drifted.length > 0) {
  console.error(`cheat sheet drifted from the engine (${checked} labels checked):\n`)
  console.error(drifted.join('\n'))
  process.exit(1)
}

console.log(
  `cheat sheet agrees with the engine: ${checked} labels round-trip, ` +
    `${NOT_A_ROMANIZATION.size} documented exceptions.`,
)
