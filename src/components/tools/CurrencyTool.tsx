import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { usePref } from '../../hooks/usePref'
import { convert, fetchRates, nepalToday, readCache, type Rate, type RateSheet } from '../../lib/forex'
import { tick } from '../../lib/haptics'
import { groupNepali, toWesternDigits } from '../../lib/nepaliNumber'
import { ToolHeader } from '../ToolHeader'
import { ClearField } from './ClearField'
import { ToolIcon } from './ToolIcons'

/* Rupees to and from the currencies Nepal Rastra Bank quotes, at NRB's own
 * daily rates (see lib/forex.ts for why NRB and how offline works).
 *
 * The side of the rate follows the direction, the way a counter applies it:
 * changing dollars into rupees gets the bank's buying rate, changing rupees
 * into dollars pays its selling rate. Both are printed under the answer so
 * nobody has to take the arithmetic on trust.
 *
 * With nothing typed, the answer shows what 1 is worth, in the placeholder's
 * colour — the rate itself, which is most of what people open this to see. */

type Status = 'idle' | 'loading' | 'ready' | 'stale' | 'error'

/* Currencies with no minor unit in everyday use. Everything else shows two
   decimals; rupees always do, because paisa are on every bank slip. */
const WHOLE_UNITS = new Set(['JPY', 'KRW'])

function parse(raw: string): number | null {
  const text = toWesternDigits(raw).replace(/[,\s]/g, '')
  if (!/^(\d+\.?\d*|\.\d+)$/.test(text)) return null
  const n = Number(text)
  return Number.isFinite(n) && n < 1e13 ? n : null
}

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

  /* Only once the tool is actually opened — the tab mounts every tool, and a
     request to a bank on launch for a tool nobody looked at is a request
     nobody asked for. A sheet already saved for today needs no request.
     "Loading" for this first request is derived (wantsFirst) rather than set,
     so starting it does not render twice. */
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

export function CurrencyTool({ active }: { active: boolean }) {
  const id = useId()
  const { sheet, status, reload } = useRates(active)
  const [code, setCode] = usePref('currency')
  const [toNpr, setToNpr] = usePref('currencyToNpr')
  const [raw, setRaw] = useState('')
  const amountRef = useRef<HTMLInputElement>(null)

  const rates = sheet?.rates ?? []
  const rate: Rate | undefined = rates.find((r) => r.iso3 === code) ?? rates[0]
  const amount = raw.trim() ? parse(raw) : null
  const invalid = raw.trim() !== '' && amount === null
  const shown = amount ?? 1
  const result = rate ? convert(shown, rate, toNpr ? 'toNpr' : 'fromNpr') : null
  const resultText =
    result === null || !rate ? '—' : toNpr ? formatNpr(result) : formatForeign(result, rate.iso3)

  const picker = (
    <span className="fx__cur">
      <span className="fx__code" aria-hidden="true">
        {rate?.iso3 ?? code}
      </span>
      <svg className="fx__chev" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
        <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select
        className="fx__select"
        aria-label="Currency"
        value={rate?.iso3 ?? code}
        disabled={!rates.length}
        onChange={(e) => {
          tick()
          setCode(e.target.value)
        }}
      >
        {rates.length ? (
          rates.map((r) => (
            <option key={r.iso3} value={r.iso3}>
              {r.iso3} — {r.name}
            </option>
          ))
        ) : (
          <option value={code}>{code}</option>
        )}
      </select>
    </span>
  )
  const npr = (
    <span className="fx__cur fx__cur--fixed">
      <span className="fx__code">NPR</span>
    </span>
  )

  const loadingFirst = !sheet && (status === 'loading' || status === 'idle')

  return (
    <section className="tools__card" aria-labelledby={`${id}-title`}>
      <ToolHeader id={`${id}-title`} ne="मुद्रा विनिमय" en="Currency converter · Nepal Rastra Bank rates" />

      <div className="fx">
        <div className="fx__field">
          <label className="fx__label" htmlFor={`${id}-amount`}>
            {toNpr ? `From ${rate?.name ?? 'foreign currency'}` : 'From Nepali rupees'}
          </label>
          <div className="fx__line">
            <input
              ref={amountRef}
              id={`${id}-amount`}
              className="fx__amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              placeholder="1"
              value={raw}
              aria-invalid={invalid}
              aria-describedby={`${id}-rate`}
              onChange={(e) => setRaw(e.target.value)}
            />
            <ClearField show={raw !== ''} what="the amount" onClear={() => setRaw('')} inputRef={amountRef} />
            {toNpr ? picker : npr}
          </div>
        </div>

        <button
          type="button"
          className="fx__swap"
          aria-label={toNpr ? 'Convert rupees into the other currency instead' : 'Convert into rupees instead'}
          onClick={() => {
            tick()
            /* Carry the answer across, so swapping reads the same amount back
               the other way rather than throwing the number away. */
            if (amount !== null && result !== null) {
              setRaw(String(Math.round(result * 100) / 100))
            }
            setToNpr(!toNpr)
          }}
        >
          <ToolIcon name="swap" size={18} />
        </button>

        <div className={`fx__field fx__field--out${amount === null ? ' fx__field--example' : ''}`}>
          <span className="fx__label" id={`${id}-out-label`}>
            {toNpr ? 'To Nepali rupees' : `To ${rate?.name ?? 'foreign currency'}`}
          </span>
          <div className="fx__line">
            {loadingFirst ? (
              <span className="fx__result fx__result--loading" aria-hidden="true" />
            ) : (
              <output className="fx__result" aria-labelledby={`${id}-out-label`} aria-live="polite">
                {resultText}
              </output>
            )}
            {toNpr ? npr : picker}
          </div>
        </div>
      </div>

      <div className="fx__meta" id={`${id}-rate`}>
        {invalid ? (
          <p className="fx__note fx__note--problem">Digits only, in either script, with one decimal point.</p>
        ) : rate ? (
          <>
            <p className="fx__rate">
              {/* The side of the rate this answer used, then the other side
                  and where it came from. */}
              <span className="fx__rate-main">
                {rate.unit} {rate.iso3} = रु {(toNpr ? rate.buy : rate.sell).toFixed(2)}
                <span className="fx__rate-side"> {toNpr ? 'buying' : 'selling'}</span>
              </span>
              <span className="fx__rate-src">
                {toNpr ? 'Selling' : 'Buying'} रु {(toNpr ? rate.sell : rate.buy).toFixed(2)} · NRB,{' '}
                {formatDay(sheet!.date)}
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
          </>
        ) : status === 'error' ? (
          <>
            <p className="fx__note fx__note--problem">
              Couldn’t reach Nepal Rastra Bank. Rates need a connection the first time; after that the last ones are
              kept for offline use.
            </p>
            <button type="button" className="btn tools__copy" onClick={() => reload()}>
              Try again
            </button>
          </>
        ) : (
          <p className="fx__note">Getting today’s rates from Nepal Rastra Bank…</p>
        )}
      </div>
      <p className="tools__hint">
        Banks and money changers set their own rates around these, so expect a little less at the counter.
      </p>
    </section>
  )
}
