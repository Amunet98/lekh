#!/usr/bin/env node
/**
 * Builds src/data/calendar/panchang.json — the festival, holiday and tithi data
 * the Calendar tab renders.
 *
 *   npm run calendar:data              # default year span
 *   npm run calendar:data -- 2082 2087 # explicit BS range
 *
 * WHY THIS IS A DATA FILE AND NOT A CALCULATION
 *
 * Bikram Sambat *dates* are computable from a month-length table, and
 * `nepali-date-converter` ships one for BS 2000–2090 — that is what draws the
 * grid and what the AD↔BS converter uses, and it needs nothing from here.
 *
 * The *festivals* are a different problem. Dashain, Tihar, Teej, Shivaratri,
 * Janai Purnima and most of the rest are lunar: they fall on a tithi, which
 * needs real lunar ephemeris plus Nepali panchang conventions about which
 * sunrise a tithi belongs to. Deriving those in the browser would be a large
 * bundle and a high chance of being subtly, invisibly wrong — a Dashain that
 * is one day off is worse than no Dashain at all. So they are tabulated.
 *
 * The consequence is a hard coverage limit: the calendar grid works for any
 * year the converter knows, but festivals only exist for the years baked in
 * here. The UI must say so rather than silently showing an empty month —
 * see COVERAGE in src/lib/calendar/panchang.ts.
 *
 * SOURCE AND LICENCE
 *
 * https://github.com/S4NKALP/nepali-calendar-api — MIT, Copyright (c) 2026
 * Sankalp Tharu. That project scrapes nepalicalendar.rat32.com, so this is a
 * third-party almanac rather than an official Government of Nepal notice.
 * Treat it as good but not authoritative: public-holiday lists are set by
 * cabinet decision each year and do change.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dateConfigMap } from 'nepali-date-converter'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const RAW = 'https://raw.githubusercontent.com/S4NKALP/nepali-calendar-api/main/data'

const [, , fromArg, toArg] = process.argv
const FROM = Number(fromArg) || 2081
const TO = Number(toArg) || 2086

/* The month-length table the app itself uses, keyed the way the source data
   is indexed. Cross-checking against it is the whole point of this step: two
   independent sources agreeing on how many days Aswin 2083 had is real
   evidence, and a disagreement means one of them is wrong about a month the
   app is about to draw. */
const MONTH_KEYS = [
  'Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Aswin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
]

const out = {}
const problems = []
/* Years where the two sources disagreed about any month's length. These are
   DROPPED rather than shipped, and the reason is worth stating plainly: the
   grid is drawn from nepali-date-converter's table while the festivals come
   from the almanac scrape. If they disagree about how long Jestha is, then
   every festival after Jestha lands on the wrong square — silently, and in a
   way that looks completely normal. A missing month is obvious; a Dashain on
   the wrong day is not. */
const rejected = new Set()
let festivalCount = 0
let holidayCount = 0

for (let year = FROM; year <= TO; year++) {
  const expected = dateConfigMap[String(year)]
  if (!expected) {
    problems.push(`BS ${year}: nepali-date-converter has no month-length table for this year`)
    continue
  }
  out[year] = {}

  for (let month = 1; month <= 12; month++) {
    const url = `${RAW}/${year}/${month}.json`
    const res = await fetch(url)
    if (!res.ok) {
      problems.push(`BS ${year}-${month}: HTTP ${res.status} from ${url}`)
      continue
    }
    const json = await res.json()

    /* `days` is a 35- or 42-cell grid including the blank leading cells before
       the 1st, so the real days are the ones carrying a Devanagari numeral. */
    const days = json.days.filter((c) => c.n && String(c.n).trim() !== '')

    const expectedLen = expected[MONTH_KEYS[month - 1]]
    if (days.length !== expectedLen) {
      problems.push(
        `BS ${year}-${month} (${MONTH_KEYS[month - 1]}): source has ${days.length} days, ` +
          `nepali-date-converter says ${expectedLen} — SOURCES DISAGREE`,
      )
      rejected.add(year)
    }

    const festivals = {}
    const holidays = []
    const tithis = []

    days.forEach((cell, i) => {
      const day = i + 1
      const f = (cell.f || '').trim()
      if (f) {
        festivals[day] = f
        festivalCount++
      }
      if (cell.h === true) {
        holidays.push(day)
        holidayCount++
      }
      tithis.push((cell.t || '').trim())
    })

    out[year][month] = { f: festivals, h: holidays, t: tithis }
  }
  process.stdout.write(`  BS ${year} ✓\n`)
}

for (const year of rejected) delete out[year]

const kept = Object.keys(out).map(Number).sort((a, b) => a - b)
if (kept.length === 0) {
  console.error('\nNo year survived the month-length cross-check. Nothing written.')
  process.exit(1)
}

/* Coverage travels with the data. The UI reads it to say which years it can
   actually speak for, instead of drawing an empty month and letting someone
   conclude there are no festivals in Kartik. */
const payload = {
  coverage: { from: kept[0], to: kept[kept.length - 1] },
  source: 'https://github.com/S4NKALP/nepali-calendar-api (MIT, © 2026 Sankalp Tharu)',
  generated: new Date().toISOString().slice(0, 10),
  years: out,
}

const dest = join(root, 'src', 'data', 'calendar')
mkdirSync(dest, { recursive: true })
writeFileSync(join(dest, 'panchang.json'), JSON.stringify(payload))

const bytes = Buffer.byteLength(JSON.stringify(payload))
console.log(`\nwrote src/data/calendar/panchang.json`)
console.log(`  BS ${kept[0]}–${kept[kept.length - 1]} · ${festivalCount} festival entries · ${holidayCount} holiday days`)
console.log(`  ${(bytes / 1024).toFixed(1)} KB raw`)

if (problems.length) {
  console.error(`\n${rejected.size} YEAR(S) DROPPED — the two sources disagree on month lengths:`)
  for (const p of problems) console.error('  ' + p)
  console.error(
    '\nThis is the intended behaviour, not a build failure: shipping a year whose\n' +
      'month lengths disagree would put every later festival on the wrong day.\n' +
      'Re-run once upstream and nepali-date-converter reconcile, and widen\n' +
      'COVERAGE_NOTE in src/lib/calendar/panchang.ts if the range changes.',
  )
} else {
  console.log('\nMonth lengths agree with nepali-date-converter for every month in range.')
}
