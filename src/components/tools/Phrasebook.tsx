import { useId, useState } from 'react'
import { pronounce } from '../../lib/engine/pronounce'
import { tick } from '../../lib/haptics'
import { EMERGENCY_NUMBERS, PHRASE_GROUPS, type Phrase } from '../../data/phrases'
import type { Shown } from '../translate/ShowScreen'
import { ToolHeader } from '../ToolHeader'
import { ToolIcon } from './ToolIcons'

/* What a visitor needs to say, ready-made and offline — Translate needs a
 * network or a 900 MB model, and a trail at 4,000 m has neither. The
 * emergency numbers come first, above the topics: nobody in trouble should
 * have to scroll past "Thank you".
 *
 * COMPACT ON PURPOSE
 *
 * The first version gave each line three stacked rows and a Show pill — about
 * 95px a phrase, so Basics alone was over a thousand pixels and the page was
 * mostly scrolling. Now a line is a table row: the English you look it up by
 * on the left, the Nepali and how to say it on the right, and the whole row
 * is the Show button, so the target is the full width of the thumb rather
 * than a pill at the edge. A search box finds a line across every topic,
 * which is quicker than guessing which topic "toilet" lives under. */

function matches(p: Phrase, q: string): boolean {
  const needle = q.toLowerCase()
  return (
    p.en.toLowerCase().includes(needle) ||
    p.ne.includes(q) ||
    (p.say ?? pronounce(p.ne)).toLowerCase().includes(needle)
  )
}

export function Phrasebook({ onShow }: { onShow: (shown: Shown) => void }) {
  const id = useId()
  const [groupId, setGroupId] = useState(PHRASE_GROUPS[0].id)
  const [query, setQuery] = useState('')
  const group = PHRASE_GROUPS.find((g) => g.id === groupId) ?? PHRASE_GROUPS[0]
  const q = query.trim()
  const phrases = q ? PHRASE_GROUPS.flatMap((g) => g.phrases).filter((p) => matches(p, q)) : group.phrases

  return (
    <section className="tools__card" aria-labelledby={`${id}-title`}>
      <ToolHeader id={`${id}-title`} ne="काम लाग्ने वाक्य" en="Phrasebook for travellers · works offline" />

      <div className="sos" role="group" aria-labelledby={`${id}-sos`}>
        <h3 className="sos__title" id={`${id}-sos`}>
          <ToolIcon name="phone" size={13} />
          Emergency — tap to call
        </h3>
        <ul className="sos__list">
          {EMERGENCY_NUMBERS.map((n) => (
            <li key={n.number}>
              <a className="sos__item" href={`tel:${n.number}`} aria-label={`Call ${n.label}, ${n.number}`}>
                <span className="sos__number">{n.number}</span>
                <span className="sos__label">{n.label}</span>
                <span className="sos__label sos__label--ne dev" lang="ne">
                  {n.ne}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="phrase-find">
        <ToolIcon name="search" size={16} />
        <label className="sr-only" htmlFor={`${id}-find`}>
          Find a phrase
        </label>
        <input
          id={`${id}-find`}
          className="phrase-find__input"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Find a phrase — toilet, water…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {!q && (
        <div className="phrase-topics" role="group" aria-label="Phrase topics">
          {PHRASE_GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={g.id === group.id}
              className={`tools__chip${g.id === group.id ? ' tools__chip--on' : ''}`}
              onClick={() => {
                tick()
                setGroupId(g.id)
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      {phrases.length > 0 ? (
        <ul className="phrases" aria-live={q ? 'polite' : undefined}>
          {phrases.map((p) => (
            <li key={p.en}>
              <button
                type="button"
                className="phrase"
                onClick={() => {
                  tick()
                  onShow({ text: p.ne, lang: 'ne', say: p.say })
                }}
              >
                <span className="phrase__en">{p.en}</span>
                <span className="phrase__ne dev" lang="ne">
                  {p.ne}
                </span>
                <span className="phrase__say" lang="ne-Latn">
                  {p.say ?? pronounce(p.ne)}
                </span>
                <span className="phrase__show">
                  <ToolIcon name="expand" size={16} />
                  <span className="sr-only">Show full screen</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tools__empty" aria-live="polite">
          No phrase here matches “{q}”. Translate can say anything else, online.
        </p>
      )}
      <p className="tools__hint">Tap a line to hold it up full screen for the person you’re talking to.</p>
    </section>
  )
}
