// Genuinely ambiguous romanizations: alternates offered as suggestion chips
// alongside (never instead of) the deterministic convert() result. Values
// exclude whatever convert(key) already produces — suggest() dedupes as a
// safety net regardless. Ordered most-likely first.
export const VARIANTS: Record<string, string[]> = {
  pani: ['पानी'], // पनि (also) vs पानी (water)
  ma: ['मा'], // म (I) vs मा (in/at)
  ki: ['की'], // कि (or/that) vs की (feminine possessive)
  jun: ['जून'], // जुन (which) vs जून (June/moon)
  man: ['मान'], // मन (mind/heart) vs मान (honor)
  tara: ['तारा'], // तर (but) vs तारा (star)
  kam: ['काम'], // कम (less) vs काम (work)
  khana: ['खान'], // खाना (food) vs खान (to eat)
  phul: ['फुल'], // फूल (flower) vs फुल (egg)
  ful: ['फुल'],
  sathi: ['साठी'], // साथी (friend) vs साठी (sixty)
  barsa: ['वर्षा'], // वर्ष (year) vs वर्षा (rain)
  mitho: ['मिठो'], // spelling variants
  khusi: ['खुशी'],
  sahar: ['शहर'],
  shahar: ['शहर'],
  dudh: ['दुध'],
  rukh: ['रुख'],
}
