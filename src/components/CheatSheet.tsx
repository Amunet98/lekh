import {
  VOWELS,
  CONSONANT_GROUPS,
  SEMIVOWELS_SIBILANTS,
  CONJUNCTS,
  SIGNS_DIGITS,
  DIGIT_CELLS,
  type CheatGroup,
} from '../data/cheatSheet'
import './CheatSheet.css'

interface CheatSheetProps {
  onInsert: (ch: string) => void
}

function Cells({ group, onInsert }: { group: CheatGroup; onInsert: (ch: string) => void }) {
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
    </section>
  )
}
