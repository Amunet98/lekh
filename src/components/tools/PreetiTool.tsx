import { useId, useRef, useState } from 'react'
import { useUndoableClear } from '../../hooks/useUndoableClear'
import { looksLikeRomanized, looksLikeUnicode, preetiToUnicode, unicodeToPreeti } from '../../lib/preeti'
import { romanizedToDevanagari } from '../../lib/engine/romanize'
import { tick } from '../../lib/haptics'
import { ToolHeader } from '../ToolHeader'
import { CopyButton } from './copy'

type ReadAs = 'preeti' | 'roman'

/* What the box holds decides what comes out:
 *   Nepali Unicode      → Preeti
 *   Preeti              → Unicode
 *   romanized Nepali    → Unicode, and that again as Preeti
 * The last is not a Preeti job, strictly — but "mero naam" typed into a
 * Preeti box is someone who wants Nepali, often to paste into a Preeti
 * document, and decoding it as Preeti hands them भचय लबब, which reads as the
 * converter being broken. Latin text is ambiguous between the two, so the
 * guess (looksLikeRomanized) is shown as a switch the reader can flip. */
export function PreetiTool() {
  const id = useId()
  const [text, setText] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const cleared = useUndoableClear()
  const [override, setOverride] = useState<ReadAs | null>(null)
  const trimmed = text.trim()
  const unicodeIn = looksLikeUnicode(text)
  const readAs: ReadAs = override ?? (looksLikeRomanized(text) ? 'roman' : 'preeti')

  let unicode = ''
  let preeti = ''
  if (trimmed) {
    if (unicodeIn) preeti = unicodeToPreeti(text)
    else if (readAs === 'preeti') unicode = preetiToUnicode(text)
    else {
      unicode = romanizedToDevanagari(text)
      preeti = unicodeToPreeti(unicode)
    }
  }

  return (
    <section className="tools__card" aria-labelledby={`${id}-title`}>
      <ToolHeader id={`${id}-title`} ne="प्रीति ↔ युनिकोड" en="Preeti ↔ Unicode" />
      <label className="tools__label" htmlFor={`${id}-input`}>
        Paste Preeti (it looks like <span className="tools__sample">g]kfn</span>), Nepali Unicode or romanized
        Nepali — it works out which way to convert
      </label>
      <textarea
        ref={areaRef}
        id={`${id}-input`}
        className="tools__input tools__area"
        rows={4}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={text}
        onChange={(e) => {
          if (cleared.lastCleared !== null) cleared.undo()
          setText(e.target.value)
          if (!e.target.value.trim()) setOverride(null)
        }}
      />
      {/* Under the box: the Preeti-or-romanized guess on the left, and on the
          right the same Clear the Type and Translate tabs have — a pasted
          document is worth an Undo, which takes Clear's place for a few
          seconds (useUndoableClear). Only there when there is something to
          clear or to bring back. */}
      {(text !== '' || cleared.lastCleared !== null) && (
        <div className="tools__bar">
          {trimmed && !unicodeIn && (
            <div className="tools__read-as" role="radiogroup" aria-label="Read the text as">
              <span className="tools__read-as-label" aria-hidden="true">
                Read as
              </span>
              {(['preeti', 'roman'] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  role="radio"
                  aria-checked={readAs === kind}
                  className={`tools__chip${readAs === kind ? ' tools__chip--on' : ''}`}
                  onClick={() => {
                    tick()
                    setOverride(kind)
                  }}
                >
                  {kind === 'preeti' ? 'Preeti' : 'Romanized'}
                </button>
              ))}
            </div>
          )}
          {text !== '' ? (
            <button
              type="button"
              className="btn tools__clear"
              onClick={() => {
                tick()
                cleared.remember(text)
                setText('')
                setOverride(null)
                areaRef.current?.focus()
              }}
            >
              Clear
            </button>
          ) : (
            <button
              type="button"
              className="btn tools__clear"
              onClick={() => {
                const back = cleared.undo()
                if (back !== null) {
                  tick()
                  setText(back)
                }
              }}
            >
              Undo clear
            </button>
          )}
        </div>
      )}
      {unicode && (
        <>
          <div className="tools__out-head">
            <span className="tools__direction">
              {readAs === 'roman' && !unicodeIn ? 'Romanized → Unicode' : 'Preeti → Unicode'}
            </span>
            <CopyButton text={unicode} what="Unicode text" />
          </div>
          <p className="tools__out tools__out--answer dev" lang="ne">
            {unicode}
          </p>
        </>
      )}
      {preeti && (
        <>
          <div className="tools__out-head">
            <span className="tools__direction">
              {unicodeIn ? 'Unicode → Preeti' : 'As Preeti'}
            </span>
            <CopyButton text={preeti} what="Preeti text" />
          </div>
          <p className="tools__out tools__out--preeti">{preeti}</p>
          <p className="tools__hint">
            This only reads as Nepali in a document whose font is set to Preeti.
          </p>
        </>
      )}
    </section>
  )
}
