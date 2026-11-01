import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { usePref } from '../../hooks/usePref'
import { convert, fetchRates, nepalToday, readCache, type Rate, type RateSheet } from '../../lib/forex'
import { tick } from '../../lib/haptics'
import { pronounce } from '../../lib/engine/pronounce'
import {
  englishAmount,
  englishSpoken,
  groupNepali,
  nepaliAmount,
  nepaliSpoken,
  parseAmount,
  toDevanagariDigits,
  type ParsedAmount,
} from '../../lib/nepaliNumber'
import { ToolHeader } from '../ToolHeader'
import { ClearField } from './ClearField'
import { CopyButton } from './copy'
import { ToolIcon } from './ToolIcons'

/* Money: an amount written out in words, and converted at Nepal Rastra Bank's
 * rates, in one tool (1.9.94). They were two tabs, Amount and Currency, that
 * both started with somebody typing a number.
 *
 * ONE AMOUNT, A CURRENCY CHIP
 *
 * The chip on the amount says what the number is. It opens on रु NPR every
 * time, not on the last currency used: then it is exactly the old Amount tool,
 * words first and the cheque lines under them, with no rates on screen, and
 * someone writing a cheque never lands on dollars because they checked a rate
 * last week. Pick a foreign currency and the amount converts into rupees at
 * the bank's buying rate, and the rupee figure is what gets written out in
 * words. That pairing, "$250 = रु 37,907.50, सैँतीस हजार…", is new.
 *
 * The other direction, rupees into a foreign currency, is a line opened on
 * purpose ("Convert to another currency") under a rupee amount, at the
 * selling rate. The foreign currency last picked in either place is
 * remembered (the `currency` pref) and offered first.
 *
 * The side of the rate follows the direction, the way a counter applies it:
 * dollars into rupees gets the bank's buying rate, rupees into dollars pays
 * its selling rate. Both are printed so nobody takes the arithmetic on trust.
 * See lib/forex.ts for why NRB and how offline works. */

type Status = 'idle' | 'loading' | 'ready' | 'stale' | 'error'

const NPR = 'NPR'

/* Currencies with no minor unit in everyday use. Everything else shows two
   decimals; rupees always do, because paisa are on every bank slip. */
const WHOLE_UNITS = new Set(['JPY', 'KRW'])

/* What goes in the chip's tile. A symbol where there is one people know,
   the code's first letter where there is not. */
const SYMBOLS: Record<string, string> = {
  NPR: 'रु',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  AUD: '$',
  CAD: '$',
  SGD: '$',
  HKD: '$',
}
const symbolOf = (code: string) => SYMBOLS[code] ?? code.charAt(0)

function formatNpr(n: number): string {
  const paisa = Math.round(n * 100)
  return `${groupNepali(Math.floor(paisa / 100))}.${String(paisa % 100).padStart(2, '0')}`
}

function formatForeign(n: number, iso3: string): string {
  const digits = WHOLE_UNITS.has(iso3) ? 0 : 2
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** "14 Oct 2026" from YYYY-MM-DD, read as a plain calendar date. */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** A rupee figure as the words engine wants it: whole rupees and paisa,
 *  with no "zero paisa" when it comes out round. */
function toRupees(n: number): ParsedAmount {
  const p = Math.round(n * 100)
  return { whole: Math.floor(p / 100), paisa: p % 100 || null }
}

function useRates(active: boolean) {
  const [sheet, setSheet] = useState<RateSheet | null>(() => readCache())
  const [fetching, setFetching] = useState<'none' | 'loading' | 'done' | 'failed'>('none')
  const inFlight = useRef(false)

  /* State is only ever set once the network has answered, never
     synchronously on the way in. */
  const onLoaded = useCallback((next: RateSheet) => {
    inFlight.current = false
    setSheet(next)
    setFetching('done')
  }, [])
  const onFailed = useCallback(() => {
    inFlight.current = false
    setFetching('failed')
  }, [])

  const reload = useCallback(() => {
    setFetching('loading')
    if (inFlight.current) return
    inFlight.current = true
    fetchRates().then(onLoaded, onFailed)
  }, [onLoaded, onFailed])

  /* Only once rates are actually wanted: the tab mounts every tool, and a
     request to a bank for a tool nobody looked at, or for a cheque amount
     that needs no rate, is a request nobody asked for. A sheet already saved
     for today needs no request. "Loading" for this first request is derived
     (wantsFirst) rather than set, so starting it does not render twice. */
  const freshToday = sheet?.date === nepalToday()
  const wantsFirst = active && fetching === 'none' && !freshToday
  useEffect(() => {
    if (!wantsFirst || inFlight.current) return
    inFlight.current = true
    fetchRates().then(onLoaded, onFailed)
  }, [wantsFirst, onLoaded, onFailed])

  const status: Status =
    fetching === 'loading' || wantsFirst ? 'loading'
    : fetching === 'failed' ? (sheet ? 'stale' : 'error')
    : sheet ? 'ready'
    : 'idle'
  return { sheet, status, reload }
}

/* A pill that shows a symbol tile and the code, with the native select laid
   invisibly over it, so the list that opens is the platform's own, with full
   names, while the closed control stays small. */
function CurrencyChip({
  value,
  rates,
  withNpr,
  remembered,
  label,
  onChange,
}: {
  value: string
  rates: Rate[]
  withNpr: boolean
  /** Offered before any rates have arrived, so a first-ever conversion has
   *  something to pick; picking it is what fetches the rates. */
  remembered: string
  label: string
  onChange: (code: string) => void
}) {
  const extra = [value, remembered].filter(
    (c, i, all) => c !== NPR && all.indexOf(c) === i && !rates.some((r) => r.iso3 === c),
  )
  return (
    <span className={`fx__cur money__chip${value === NPR ? ' money__chip--npr' : ''}`}>
      <span className="money__sym" aria-hidden="true">
        {symbolOf(value)}
      </span>
      <span className="fx__code" aria-hidden="true">
        {value}
      </span>
      <svg className="fx__chev" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        className="fx__select"
        aria-label={label}
        value={value}
        onChange={(e) => {
          tick()
          onChange(e.target.value)
        }}
      >
        {withNpr && <option value={NPR}>NPR — Nepali rupee</option>}
        {rates.map((r) => (
          <option key={r.iso3} value={r.iso3}>
            {r.iso3} — {r.name}
          </option>
        ))}
        {extra.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </span>
  )
}

export function MoneyTool({ active }: { active: boolean }) {
  const id = useId()
  const [lastForeign, setLastForeign] = usePref('currency')
  const [cur, setCur] = useState(NPR)
  const [sideOpen, setSideOpen] = useState(false)
  /* Rates are fetched when a conversion needs them, and once on opening the
     tool if none have ever been saved: without a list the chip could offer
     only NPR and the remembered currency, so a first-time user after INR had
     to pick USD first (seen on a fresh install, 1.9.99). After that the saved
     list fills the chip, and a cheque amount sends nothing. */
  const [cachedAtStart] = useState(() => readCache() !== null)
  const { sheet, status, reload } = useRates(active && (cur !== NPR || sideOpen || !cachedAtStart))
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const rates = sheet?.rates ?? []
  const rateOf = (code: string) => rates.find((r) => r.iso3 === code)
  const foreign = cur !== NPR
  const inRate = foreign ? rateOf(cur) : undefined
  const sideRate = rateOf(lastForeign) ?? rateOf('USD') ?? rates[0]
  const sideCode = sideRate?.iso3 ?? lastForeign

  const amount = raw.trim() ? parseAmount(raw) : null
  const invalid = raw.trim() !== '' && amount === null
  const value = amount ? amount.whole + (amount.paisa ?? 0) / 100 : null

  /* The figure the words are about: the amount itself in rupees, or what a
     foreign amount comes to in rupees. */
  const npr = foreign && inRate && value !== null ? convert(value, inRate, 'toNpr') : null
  const rupees: ParsedAmount | null = foreign ? (npr !== null ? toRupees(npr) : null) : amount

  let words = ''
  let rows: { label: string; value: string; dev?: boolean; what: string }[] = []
  if (rupees) {
    const paisa = rupees.paisa !== null ? `.${String(rupees.paisa).padStart(2, '0')}` : ''
    const grouped = groupNepali(rupees.whole) + paisa
    words = nepaliSpoken(rupees)
    rows = [
      { label: 'नेपाली अङ्क', value: toDevanagariDigits(grouped), dev: true, what: 'Nepali digits' },
      { label: 'Digits', value: grouped, what: 'digits' },
      { label: 'English', value: englishSpoken(rupees), what: 'English words' },
      { label: 'चेकमा', value: nepaliAmount(rupees), dev: true, what: 'Nepali cheque line' },
      { label: 'Cheque', value: englishAmount(rupees), what: 'English cheque line' },
    ]
  }

  const pickCurrency = (code: string) => {
    setCur(code)
    if (code !== NPR) {
      setLastForeign(code)
      setSideOpen(false)
    }
  }

  /* Where the rate came from, or why there is none yet. Shared by both
     directions; `side` is the half of the rate the answer used. */
  const rateMeta = (rate: Rate | undefined, side: 'buy' | 'sell') =>
    rate ? (
      <div className="fx__meta">
        <p className="fx__rate">
          <span className="fx__rate-main">
            {rate.unit} {rate.iso3} ={' '}
            <span className="money__num">रु {(side === 'buy' ? rate.buy : rate.sell).toFixed(2)}</span>
            <span className="fx__rate-side"> {side === 'buy' ? 'buying' : 'selling'}</span>
          </span>
          <span className="fx__rate-src">
            {side === 'buy' ? 'Selling' : 'Buying'}{' '}
            <span className="money__num">रु {(side === 'buy' ? rate.sell : rate.buy).toFixed(2)}</span> · NRB,{' '}
            <span className="money__num">{formatDay(sheet!.date)}</span>
            {status === 'stale' && ' · saved, offline'}
            {status === 'loading' && ' · checking…'}
          </span>
        </p>
        <button
          type="button"
          className="fx__refresh"
          aria-label="Check for newer rates"
          disabled={status === 'loading'}
          onClick={() => {
            tick()
            reload()
          }}
        >
          <ToolIcon name="refresh" size={16} />
        </button>
      </div>
    ) : status === 'error' ? (
      <div className="fx__meta">
        <p className="fx__note fx__note--problem">
          Couldn’t reach Nepal Rastra Bank. Rates need a connection the first time; after that the last ones are
          kept for offline use.
        </p>
        <button type="button" className="btn tools__copy" onClick={() => reload()}>
          Try again
        </button>
      </div>
    ) : (
      <div className="fx__meta">
        <p className="fx__note">Getting today’s rates from Nepal Rastra Bank…</p>
      </div>
    )

  return (
    <section className="tools__card" aria-labelledby={`${id}-title`}>
      <ToolHeader id={`${id}-title`} ne="रकम" en="Amounts in words · Nepal Rastra Bank rates" />
      <label className="tools__label" htmlFor={`${id}-input`}>
        An amount, in either script
      </label>
      <div className={`money__box${invalid ? ' money__box--invalid' : ''}`}>
        <input
          ref={inputRef}
          id={`${id}-input`}
          className="tools__input tools__input--number"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder={foreign ? '1' : '12500 or १२५००'}
          value={raw}
          aria-invalid={invalid}
          aria-describedby={`${id}-hint`}
          onChange={(e) => setRaw(e.target.value)}
        />
        <ClearField show={raw !== ''} what="the amount" onClear={() => setRaw('')} inputRef={inputRef} />
        <CurrencyChip value={cur} rates={rates} withNpr remembered={lastForeign} label="Currency of the amount" onChange={pickCurrency} />
      </div>
      <p className="tools__hint" id={`${id}-hint`} aria-live="polite">
        {invalid
          ? 'Digits only (Nepali or English), commas allowed, and at most two after the point.'
          : amount || foreign
            ? ''
            : 'Writes an amount out for a cheque, or reads a price in Nepali digits.'}
      </p>

      {/* Foreign into rupees. With nothing typed it shows what 1 is worth, in
          the placeholder's colour: the rate itself, which is most of what
          people open a converter to see. */}
      {foreign && (
        <div className="money__conv">
          <output className={`money__fig${value === null ? ' money__fig--example' : ''}`} aria-live="polite">
            <span className="money__eq" aria-hidden="true">
              =
            </span>{' '}
            {/* The symbol may go to its own line on a narrow phone; the figure
                never breaks inside itself ("6,17,62,50" / "0.00" did). */}
            {inRate ? (
              <>
                रु <span className="money__num">{formatNpr(convert(value ?? 1, inRate, 'toNpr'))}</span>
              </>
            ) : (
              '—'
            )}
          </output>
          {rateMeta(inRate, 'buy')}
        </div>
      )}

      {/* Rupees into a foreign currency: a line opened on purpose. */}
      {!foreign && sideOpen && (
        <div className="money__side">
          <div className="money__side-row">
            <output className={`money__side-fig${value === null ? ' money__fig--example' : ''}`} aria-live="polite">
              {sideRate ? `${formatForeign(convert(value ?? 1, sideRate, 'fromNpr'), sideRate.iso3)}` : '—'}
            </output>
            <CurrencyChip
              value={sideCode}
              rates={rates}
              withNpr={false}
              remembered={lastForeign}
              label="Convert into"
              onChange={(code) => setLastForeign(code)}
            />
            <button
              type="button"
              className="fx__refresh money__side-close"
              aria-label="Stop converting"
              onClick={() => {
                tick()
                setSideOpen(false)
              }}
            >
              <ToolIcon name="x" size={16} />
            </button>
          </div>
          {rateMeta(sideRate, 'sell')}
        </div>
      )}

      {rupees && (
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
                <dt className={/[ऀ-ॿ]/.test(row.label) ? 'dev' : undefined}>{row.label}</dt>
                <dd className={row.dev ? 'dev' : undefined} lang={row.dev ? 'ne' : undefined}>
                  {row.value}
                </dd>
                <CopyButton text={row.value} what={row.what} />
              </div>
            ))}
          </dl>
        </div>
      )}

      {!foreign && !sideOpen && (
        <button
          type="button"
          className="money__more"
          onClick={() => {
            tick()
            setSideOpen(true)
          }}
        >
          <ToolIcon name="money" size={18} />
          <span>Convert to another currency</span>
          <svg className="money__more-chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      {(foreign || sideOpen) && (
        <p className="tools__hint">
          Banks and money changers set their own rates around these, so expect a little less at the counter.
        </p>
      )}
    </section>
  )
}
