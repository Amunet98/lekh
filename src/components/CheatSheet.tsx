import {
  VOWELS,
  CONSONANT_GROUPS,
  SEMIVOWELS_SIBILANTS,
  CONJUNCTS,
  SIGNS_DIGITS,
  DIGIT_CELLS,
  COMMON_WORDS,
  type CheatGroup,
} from '../data/cheatSheet'
import './CheatSheet.css'

interface CheatSheetProps {
  onInsert: (ch: string) => void
}

function Cells({ group, onInsert }: { group: CheatGroup; onInsert: (ch: string) => void }) {
  // The grid draws its lines as a 1px gap over a border-coloured background,
  // so any slot left over in the final row showed up as a solid grey block —
  // eleven vowels in a four-column grid left one, and it read as a rendering
  // bug. Pad the row with inert cells that paint the surface colour.
  const remainder = group.cells.length % group.columns
  const fillers = remainder === 0 ? 0 : group.columns - remainder

  return (
    <div className={`cells cells--${group.columns}`}>
      {group.cells.map((cell) => (
        <button
          key={cell.romanized + cell.glyph}
          type="button"
          className="cell"
          onClick={() => onInsert(cell.insert)}
          title={`Insert ${cell.glyph}`}
        >
          <span className="g dev">{cell.glyph}</span>
          <span className="r">{cell.romanized}</span>
        </button>
      ))}
      {Array.from({ length: fillers }, (_, i) => (
        <div key={`filler-${i}`} className="cell cell--filler" aria-hidden="true" />
      ))}
    </div>
  )
}

export function CheatSheet({ onInsert }: CheatSheetProps) {
  return (
    <section className="cheat-sheet">
      <span className="tag">Cheat sheet</span>
      <h2>How letters map</h2>

      <p className="sub">{VOWELS.label}</p>
      <Cells group={VOWELS} onInsert={onInsert} />

      <p className="sub">व्यञ्जन · consonants</p>
      {CONSONANT_GROUPS.map((group) => (
        <div key={group.label} className="cons-group">
          <p className="cons-group__label">{group.label}</p>
          <Cells group={group} onInsert={onInsert} />
        </div>
      ))}

      <p className="sub">{SEMIVOWELS_SIBILANTS.label}</p>
      <Cells group={SEMIVOWELS_SIBILANTS} onInsert={onInsert} />

      <p className="sub">{CONJUNCTS.label}</p>
      <Cells group={CONJUNCTS} onInsert={onInsert} />
      <p className="map-caption">
        Lowercase is dental (त द न), uppercase is retroflex (ट ड ण). Joints happen on their own:{' '}
        <span className="dev">t</span>+<span className="dev">r</span> → त्र.
      </p>

      <p className="sub">{SIGNS_DIGITS.label}</p>
      <Cells group={SIGNS_DIGITS} onInsert={onInsert} />
      <Cells group={DIGIT_CELLS} onInsert={onInsert} />
      <p className="map-caption">Digits convert too: type 0–9, get ०–९. Tap a cell to insert it directly.</p>

      {/* Last, not first. The tables above are the reference someone came here
          for; this is the shortcut they'll actually reach for on the second
          visit, and it reads better as a payoff than as a preamble. */}
      <p className="sub">{COMMON_WORDS.label}</p>
      {/* Wrapped so the cells can be tuned down a size: these hold whole words
          (धन्यवाद is seven glyphs), not the single letters every other table
          holds, and at the shared size they wrap inside an ~85px column. */}
      <div className="cells-words">
        <Cells group={COMMON_WORDS} onInsert={onInsert} />
      </div>
      <p className="map-caption">
        The label under each word is what you would type to get it.
      </p>
    </section>
  )
}
