export interface CheatCell {
  glyph: string // what's displayed (may show independent + matra form)
  insert: string // what tap-to-insert appends to the editor
  romanized: string
}

export interface CheatGroup {
  label: string
  columns: 4 | 5
  cells: CheatCell[]
}

export const VOWELS: CheatGroup = {
  label: 'स्वर · vowels',
  columns: 4,
  cells: [
    { glyph: 'अ', insert: 'अ', romanized: 'a' },
    { glyph: 'आ ा', insert: 'आ', romanized: 'aa' },
    { glyph: 'इ ि', insert: 'इ', romanized: 'i' },
    { glyph: 'ई ी', insert: 'ई', romanized: 'ee' },
    { glyph: 'उ ु', insert: 'उ', romanized: 'u' },
    { glyph: 'ऊ ू', insert: 'ऊ', romanized: 'oo' },
    { glyph: 'ऋ ृ', insert: 'ऋ', romanized: 'rri' },
    { glyph: 'ए े', insert: 'ए', romanized: 'e' },
    { glyph: 'ऐ ै', insert: 'ऐ', romanized: 'ai' },
    { glyph: 'ओ ो', insert: 'ओ', romanized: 'o' },
    { glyph: 'औ ौ', insert: 'औ', romanized: 'au' },
  ],
}

// Traditional वर्ग (place-of-articulation) grouping, 5x5.
export const CONSONANT_GROUPS: CheatGroup[] = [
  {
    label: 'कण्ठ्य · velar',
    columns: 5,
    cells: [
      { glyph: 'क', insert: 'क', romanized: 'k' },
      { glyph: 'ख', insert: 'ख', romanized: 'kh' },
      { glyph: 'ग', insert: 'ग', romanized: 'g' },
      { glyph: 'घ', insert: 'घ', romanized: 'gh' },
      { glyph: 'ङ', insert: 'ङ', romanized: 'ng' },
    ],
  },
  {
    label: 'तालव्य · palatal',
    columns: 5,
    cells: [
      { glyph: 'च', insert: 'च', romanized: 'ch' },
      { glyph: 'छ', insert: 'छ', romanized: 'chh' },
      { glyph: 'ज', insert: 'ज', romanized: 'j' },
      { glyph: 'झ', insert: 'झ', romanized: 'jh' },
      { glyph: 'ञ', insert: 'ञ', romanized: 'ny' },
    ],
  },
  {
    label: 'मूर्धन्य · retroflex',
    columns: 5,
    cells: [
      { glyph: 'ट', insert: 'ट', romanized: 'T' },
      { glyph: 'ठ', insert: 'ठ', romanized: 'Th' },
      { glyph: 'ड', insert: 'ड', romanized: 'D' },
      { glyph: 'ढ', insert: 'ढ', romanized: 'Dh' },
      { glyph: 'ण', insert: 'ण', romanized: 'N' },
    ],
  },
  {
    label: 'दन्त्य · dental',
    columns: 5,
    cells: [
      { glyph: 'त', insert: 'त', romanized: 't' },
      { glyph: 'थ', insert: 'थ', romanized: 'th' },
      { glyph: 'द', insert: 'द', romanized: 'd' },
      { glyph: 'ध', insert: 'ध', romanized: 'dh' },
      { glyph: 'न', insert: 'न', romanized: 'n' },
    ],
  },
  {
    label: 'ओष्ठ्य · labial',
    columns: 5,
    cells: [
      { glyph: 'प', insert: 'प', romanized: 'p' },
      { glyph: 'फ', insert: 'फ', romanized: 'ph · f' },
      { glyph: 'ब', insert: 'ब', romanized: 'b' },
      { glyph: 'भ', insert: 'भ', romanized: 'bh' },
      { glyph: 'म', insert: 'म', romanized: 'm' },
    ],
  },
]

export const SEMIVOWELS_SIBILANTS: CheatGroup = {
  label: 'अर्धस्वर र ऊष्म · semivowels & sibilants',
  columns: 4,
  cells: [
    { glyph: 'य', insert: 'य', romanized: 'y' },
    { glyph: 'र', insert: 'र', romanized: 'r' },
    { glyph: 'ल', insert: 'ल', romanized: 'l' },
    { glyph: 'व', insert: 'व', romanized: 'w · v' },
    { glyph: 'श', insert: 'श', romanized: 'sh' },
    { glyph: 'ष', insert: 'ष', romanized: 'Sh' },
    { glyph: 'स', insert: 'स', romanized: 's' },
    { glyph: 'ह', insert: 'ह', romanized: 'h' },
  ],
}

export const CONJUNCTS: CheatGroup = {
  label: 'संयुक्ताक्षर · conjuncts',
  columns: 4,
  cells: [
    { glyph: 'क्ष', insert: 'क्ष', romanized: 'ksh · x' },
    { glyph: 'त्र', insert: 'त्र', romanized: 'tr' },
    { glyph: 'ज्ञ', insert: 'ज्ञ', romanized: 'gy' },
    { glyph: 'श्र', insert: 'श्र', romanized: 'shr' },
  ],
}

export const SIGNS_DIGITS: CheatGroup = {
  label: 'चिन्ह र अंक · signs & digits',
  columns: 5,
  cells: [
    { glyph: 'ं', insert: 'ं', romanized: 'M' },
    { glyph: 'ः', insert: 'ः', romanized: 'H' },
    { glyph: 'ँ', insert: 'ँ', romanized: '~' },
    { glyph: '्', insert: '्', romanized: 'auto' },
    { glyph: '।', insert: '।', romanized: '.' },
  ],
}

export const DIGIT_CELLS: CheatGroup = {
  label: '',
  columns: 5,
  cells: [
    { glyph: '०', insert: '०', romanized: '0' },
    { glyph: '१', insert: '१', romanized: '1' },
    { glyph: '२', insert: '२', romanized: '2' },
    { glyph: '३', insert: '३', romanized: '3' },
    { glyph: '४', insert: '४', romanized: '4' },
    { glyph: '५', insert: '५', romanized: '5' },
    { glyph: '६', insert: '६', romanized: '6' },
    { glyph: '७', insert: '७', romanized: '7' },
    { glyph: '८', insert: '८', romanized: '8' },
    { glyph: '९', insert: '९', romanized: '9' },
  ],
}
