import { useId, useRef, useState } from 'react'
import { pronounce } from '../../lib/engine/pronounce'
import {
  englishAmount,
  englishWords,
  groupNepali,
  nepaliAmount,
  nepaliWords,
  parseAmount,
  toDevanagariDigits,
} from '../../lib/nepaliNumber'
import { ToolHeader } from '../ToolHeader'
import { ClearField } from './ClearField'
import { CopyButton } from './copy'

interface Row {
  label: string
  value: string
  /** The value is Nepali text, so it gets the Devanagari face and lang="ne". */
  dev?: boolean
  what: string
}

export function NumberTool() {
  const id = useId()
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const amount = raw.trim() ? parseAmount(raw) : null
  const invalid = raw.trim() !== '' && amount === null

  /* The words are the answer, so they lead, large, with how to say them
     straight underneath — the same pairing as a translation. Everything
     else is a row under them. */
  let words = ''
  let rows: Row[] = []
  if (amount) {
    const paisa = amount.paisa !== null ? `.${String(amount.paisa).padStart(2, '0')}` : ''
    const grouped = groupNepali(amount.whole) + paisa
    words = nepaliWords(amount.whole)
    rows = [
      { label: 'नेपाली अङ्क', value: toDevanagariDigits(grouped), dev: true, what: 'Nepali digits' },
      { label: 'Digits', value: grouped, what: 'digits' },
      { label: 'English', value: englishWords(amount.whole), what: 'English words' },
      { label: 'चेकमा', value: nepaliAmount(amount), dev: true, what: 'Nepali cheque line' },
      { label: 'Cheque', value: englishAmount(amount), what: 'English cheque line' },
    ]
  }

  return (
    <section className="tools__card" aria-labelledby={`${id}-title`}>
      <ToolHeader id={`${id}-title`} ne="अङ्क र रकम" en="Numbers & amounts in words" />
      <label className="tools__label" htmlFor={`${id}-input`}>
        A number or an amount, in either script
      </label>
      <div className="tools__field">
        <input
          ref={inputRef}
          id={`${id}-input`}
          className="tools__input tools__input--number"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="12500 or १२५००"
          value={raw}
          aria-invalid={invalid}
          aria-describedby={`${id}-hint`}
          onChange={(e) => setRaw(e.target.value)}
        />
        <ClearField show={raw !== ''} what="the amount" onClear={() => setRaw('')} inputRef={inputRef} />
      </div>
      <p className="tools__hint" id={`${id}-hint`} aria-live="polite">
        {invalid
          ? 'Digits only (Nepali or English), commas allowed, and at most two after the point.'
          : amount
            ? ''
            : 'Reads a price in Nepali digits, or writes an amount out for a cheque.'}
      </p>
      {amount && (
        <div className="tools__answer">
          <div className="tools__hero">
            <p className="tools__hero-text dev" lang="ne">
              {words}
            </p>
            <CopyButton text={words} what="Nepali words" />
            <p className="tools__say" lang="ne-Latn">
              {pronounce(words)}
            </p>
          </div>
          <dl className="tools__rows">
            {rows.map((row) => (
              <div className="tools__row" key={row.label}>
                <dt className={/[\u0900-\u097f]/.test(row.label) ? 'dev' : undefined}>{row.label}</dt>
                <dd className={row.dev ? 'dev' : undefined} lang={row.dev ? 'ne' : undefined}>
                  {row.value}
                </dd>
                <CopyButton text={row.value} what={row.what} />
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  )
}
