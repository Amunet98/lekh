import { GREETINGS } from './greetings'
import { PRONOUNS } from './pronouns'
import { VERBS } from './verbs'
import { PARTICLES } from './particles'
import { QUESTION } from './question'
import { TIME } from './time'
import { FAMILY } from './family'
import { FOOD } from './food'
import { NUMBERS } from './numbers'
import { ADJECTIVES } from './adjectives'
import { PLACES } from './places'
import { BODY } from './body'
import { NATURE } from './nature'
import { MISC } from './misc'

// Frequency dictionary — wins over the phonetic parser on common words
// (e.g. "pani" -> पनि, not the phonetically-plausible पानी). Lowercase keys;
// one word may appear under several romanized spellings (chha/cha -> छ).
// Split by category to keep native-speaker review tractable; merged flat
// here so lookups stay a single Record access.
export const DICT: Record<string, string> = {
  ...GREETINGS,
  ...PRONOUNS,
  ...VERBS,
  ...PARTICLES,
  ...QUESTION,
  ...TIME,
  ...FAMILY,
  ...FOOD,
  ...NUMBERS,
  ...ADJECTIVES,
  ...PLACES,
  ...BODY,
  ...NATURE,
  ...MISC,
}
