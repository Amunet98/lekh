import { useId, useState } from 'react'
import { pronounce } from '../lib/engine/pronounce'
import {
  englishAmount,
  englishWords,
  groupNepali,
  nepaliAmount,
  nepaliWords,
  parseAmount,
  toDevanagariDigits,
} from '../lib/nepaliNumber'
import { looksLikeUnicode, preetiToUnicode, unicodeToPreeti } from '../lib/preeti'
import { useToast } from '../hooks/useToast'
import { tick } from '../lib/haptics'
import './ToolsPage.css'

/* Two small jobs that kept sending people to other websites: writing an
 * amount out in words (a cheque, a form, a price you cannot read), and moving
 * text between Preeti and Unicode. Both run on the device and need no network.
 *
 * They share a tab because neither is big enough to be a section of its own,
 * and both are things you come to on purpose rather than stumble into while
 * typing — which is why they are not buried in the Type screen's ⋯ menu. */

function useCopy() {
  const toast = useToast()
  return async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      tick()
      toast.done(`Copied ${what}`)
    } catch {
      toast.problem('Could not copy — select the text and copy it instead')
    }
  }
}

function CopyButton({ text, what }: { text: string; what: string }) {
  const copy = useCopy()
  return (
    <button
      type="button"
      className="btn tools__copy"
      aria-label={`Copy ${what}`}
      onClick={() => void copy(text, what)}
    >
      Copy
    </button>
  )
}

interface Row {
  label: string
  value: string
  /** The value is Nepali text, so it gets the Devanagari face and lang="ne". */
  dev?: boolean
  what: string
}

function NumberTool() {
  const id = useId()
  const [raw, setRaw] = useState('')
  const amount = raw.trim() ? parseAmount(raw) : null
  const invalid = raw.trim() !== '' && amount === null

  let rows: Row[] = []
  if (amount) {
    const paisa = amount.paisa !== null ? `.${String(amount.paisa).padStart(2, '0')}` : ''
    const grouped = groupNepali(amount.whole) + paisa
    const words = nepaliWords(amount.whole)
    rows = [
      { label: 'नेपाली अङ्क', value: toDevanagariDigits(grouped), dev: true, what: 'Nepali digits' },
      { label: 'Digits', value: grouped, what: 'digits' },
      { label: 'शब्दमा', value: words, dev: true, what: 'Nepali words' },
      { label: 'Say it', value: pronounce(words), what: 'pronunciation' },
      { label: 'English', value: englishWords(amount.whole), what: 'English words' },
      { label: 'चेकमा · cheque', value: nepaliAmount(amount), dev: true, what: 'Nepali cheque line' },
      { label: 'Cheque · English', value: englishAmount(amount), what: 'English cheque line' },
    ]
  }

  return (
    <section className="tools__card" aria-labelledby={`${id}-title`}>
      <h2 className="tools__title" id={`${id}-title`}>
        <span className="dev">अङ्क र रकम</span> · numbers in words
      </h2>
      <label className="tools__label" htmlFor={`${id}-input`}>
        A number or an amount, in either script
      </label>
      <input
        id={`${id}-input`}
        className="tools__input"
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
      <p className="tools__hint" id={`${id}-hint`} aria-live="polite">
        {invalid
          ? 'Digits only (Nepali or English), commas allowed, and at most two after the point.'
          : amount
            ? ''
            : 'Reads a price in Nepali digits, or writes an amount out for a cheque.'}
      </p>
      {rows.length > 0 && (
        <dl className="tools__rows">
          {rows.map((row) => (
            <div className="tools__row" key={row.label}>
              <dt className={row.label.match(/[ऀ-ॿ]/) ? 'dev' : undefined}>{row.label}</dt>
              <dd className={row.dev ? 'dev' : undefined} lang={row.dev ? 'ne' : undefined}>
                {row.value}
              </dd>
              <CopyButton text={row.value} what={row.what} />
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}

function PreetiTool() {
  const id = useId()
  const [text, setText] = useState('')
  const toPreeti = looksLikeUnicode(text)
  const output = !text.trim() ? '' : toPreeti ? unicodeToPreeti(text) : preetiToUnicode(text)

  return (
    <section className="tools__card" aria-labelledby={`${id}-title`}>
      <h2 className="tools__title" id={`${id}-title`}>
        <span className="dev">प्रीति ↔ युनिकोड</span> · Preeti ↔ Unicode
      </h2>
      <label className="tools__label" htmlFor={`${id}-input`}>
        Paste Preeti text (it looks like <span className="tools__sample">g]kfn</span>) or Nepali
        Unicode — the direction is worked out from what you paste
      </label>
      <textarea
        id={`${id}-input`}
        className="tools__input tools__area"
        rows={4}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {output && (
        <>
          <div className="tools__out-head">
            <span className="tools__direction">
              {toPreeti ? 'Unicode → Preeti' : 'Preeti → Unicode'}
            </span>
            <CopyButton text={output} what={toPreeti ? 'Preeti text' : 'Unicode text'} />
          </div>
          <p
            className={`tools__out${toPreeti ? ' tools__out--preeti' : ' dev'}`}
            lang={toPreeti ? undefined : 'ne'}
          >
            {output}
          </p>
          {toPreeti && (
            <p className="tools__hint">
              This only reads as Nepali in a document whose font is set to Preeti.
            </p>
          )}
        </>
      )}
    </section>
  )
}

export function ToolsPage() {
  return (
    <div className="tools">
      <h1 className="sr-only">Tools</h1>
      <NumberTool />
      <PreetiTool />
    </div>
  )
}
