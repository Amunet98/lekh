/* Exchange rates for the currency tool, from Nepal Rastra Bank.
 *
 * NRB fixes the rupee's reference rates once a day and publishes them through
 * a public JSON API (https://www.nrb.org.np/api/forex/v1/rates) that answers
 * with `Access-Control-Allow-Origin: *`, so the browser can ask it directly —
 * no proxy of our own, and nothing about the user in the request: it carries
 * a date range and nothing else.
 *
 * It is the source a bank or money changer in Nepal quotes against, which is
 * what someone standing at a counter wants to check them by. It is also the
 * only source that agrees with the rupee's peg to the Indian rupee (1.60) to
 * the paisa, where a generic FX feed drifts.
 *
 * OFFLINE
 *
 * The last good answer is kept in localStorage and used whenever the network
 * is not there. A trek is exactly when this tool is wanted and exactly when
 * there is no signal; a rate a few days old, clearly dated, is useful there,
 * while "could not load" is not.
 *
 * DATES
 *
 * "Today" is today in Nepal (UTC+05:45), never toISOString(): that is UTC,
 * and for the first five and three-quarter hours of every Nepali day it names
 * yesterday. */

export interface Rate {
  /** ISO 4217 code, e.g. "USD". */
  iso3: string
  name: string
  /** How many units the rate is quoted for — 100 for INR and KRW, 10 for JPY. */
  unit: number
  /** Rupees the bank pays for `unit` of the currency. */
  buy: number
  /** Rupees the bank charges for `unit` of the currency. */
  sell: number
}

export interface RateSheet {
  /** The day NRB published these for, YYYY-MM-DD. */
  date: string
  rates: Rate[]
}

const API = 'https://www.nrb.org.np/api/forex/v1/rates'
/* The suffix is a schema version: bump it if RateSheet changes shape, or a
   returning user's cache is read as the new shape. */
const CACHE_KEY = 'lekh:forex:1'
/* NRB publishes on holidays too, but not always — a week back always finds
   the latest sheet without asking for a month of them. */
const LOOKBACK_DAYS = 7
const TIMEOUT_MS = 10_000

/** Today's date in Nepal, YYYY-MM-DD. en-CA is the locale whose short date
 *  format is already ISO-shaped. */
export function nepalToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kathmandu',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** YYYY-MM-DD minus n days. Pure calendar arithmetic on the date's own
 *  numbers; going through UTC midnight is safe here because nothing is
 *  converted between zones. */
export function minusDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d - n))
  return t.toISOString().slice(0, 10)
}

interface NrbPayload {
  date?: unknown
  rates?: unknown
}

/** The newest usable sheet in an NRB response, or null. Validated field by
 *  field: this is someone else's API, and a rate that parsed to NaN would
 *  turn into a confident wrong answer on the screen. */
export function parseNrb(json: unknown): RateSheet | null {
  const payload = (json as { data?: { payload?: unknown } })?.data?.payload
  if (!Array.isArray(payload)) return null
  const sheets: RateSheet[] = []
  for (const day of payload as NrbPayload[]) {
    if (typeof day?.date !== 'string' || !Array.isArray(day.rates)) continue
    const rates: Rate[] = []
    for (const r of day.rates as Record<string, unknown>[]) {
      const cur = r?.currency as Record<string, unknown> | undefined
      const iso3 = cur?.iso3
      const name = cur?.name
      const unit = Number(cur?.unit)
      const buy = Number(r?.buy)
      const sell = Number(r?.sell)
      if (typeof iso3 !== 'string' || !/^[A-Z]{3}$/.test(iso3)) continue
      if (!(unit > 0 && buy > 0 && sell > 0)) continue
      rates.push({ iso3, name: typeof name === 'string' ? tidyName(name) : iso3, unit, buy, sell })
    }
    if (rates.length) sheets.push({ date: day.date, rates })
  }
  sheets.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return sheets.at(-1) ?? null
}

/* NRB's own names, with its two misspellings and its "European Euro" put
   right; everything else is left as published. */
function tidyName(name: string): string {
  return name
    .replace(/^European Euro$/, 'Euro')
    .replace(/^U\.S\. Dollar$/, 'US Dollar')
    .replace(/Kroner$/, 'Krona')
    .replace(/^Danish Krona$/, 'Danish Krone')
    .replace(/^Kuwaity/, 'Kuwaiti')
}

export function readCache(): RateSheet | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const sheet = JSON.parse(raw) as RateSheet
    if (typeof sheet?.date !== 'string' || !Array.isArray(sheet.rates) || !sheet.rates.length) return null
    return sheet
  } catch {
    return null
  }
}

function writeCache(sheet: RateSheet): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(sheet))
  } catch {
    // Blocked storage — this visit still has its rates.
  }
}

/** Fetches the latest sheet, caching it. Throws when NRB cannot be reached
 *  or answers with nothing usable. */
export async function fetchRates(today: string = nepalToday()): Promise<RateSheet> {
  const url = `${API}?from=${minusDays(today, LOOKBACK_DAYS)}&to=${today}&per_page=${LOOKBACK_DAYS + 1}&page=1`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`NRB answered ${res.status}`)
    const sheet = parseNrb(await res.json())
    if (!sheet) throw new Error('NRB sent no rates')
    writeCache(sheet)
    return sheet
  } finally {
    clearTimeout(timer)
  }
}

export type Direction = 'toNpr' | 'fromNpr'

/** Converts with the side of the rate a counter would use: the bank BUYS your
 *  dollars (buy rate) and SELLS you dollars (sell rate). */
export function convert(amount: number, rate: Rate, direction: Direction): number {
  return direction === 'toNpr'
    ? (amount * rate.buy) / rate.unit
    : (amount * rate.unit) / rate.sell
}
