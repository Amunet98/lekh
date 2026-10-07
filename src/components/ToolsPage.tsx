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
import { looksLikeRomanized, looksLikeUnicode, preetiToUnicode, unicodeToPreeti } from '../lib/preeti'
import { romanizedToDevanagari } from '../lib/engine/romanize'
import { DateConverter } from './calendar/DateConverter'
import { useToast } from '../hooks/useToast'
import { tick } from '../lib/haptics'
import './ToolsPage.css'

/* Small jobs that kept sending people to other websites: converting a date
 * between BS and AD, writing an amount out in words (a cheque, a form, a
 * price you cannot read), and moving text between Preeti and Unicode. All of
 * them run on the device and need no network.
 *
 * They share a tab because none is big enough to be a section of its own, and
 * all are things you come to on purpose rather than stumble into — which is
 * why the date converter left Patro's month bar, where it was a small icon
 * that people did not find, for here. */

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
function PreetiTool() {
  const id = useId()
  const [text, setText] = useState('')
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
      <h2 className="tools__title" id={`${id}-title`}>
        <span className="dev">प्रीति ↔ युनिकोड</span> · Preeti ↔ Unicode
      </h2>
      <label className="tools__label" htmlFor={`${id}-input`}>
        Paste Preeti text (it looks like <span className="tools__sample">g]kfn</span>), Nepali
        Unicode, or romanized Nepali — the direction is worked out from what is in the box
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
        onChange={(e) => {
          setText(e.target.value)
          if (!e.target.value.trim()) setOverride(null)
        }}
      />
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
              {kind === 'preeti' ? 'Preeti' : 'Romanized Nepali'}
            </button>
          ))}
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
          <p className="tools__out dev" lang="ne">
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

export function ToolsPage() {
  return (
    <div className="tools">
      <h1 className="sr-only">Tools</h1>
      <DateConverter />
      <NumberTool />
      <PreetiTool />
    </div>
  )
}
