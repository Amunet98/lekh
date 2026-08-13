#!/usr/bin/env node
/**
 * Copies the calendar data the web app uses into the Android widget's assets.
 *
 *   npm run android:assets
 *
 * The widget is a separate program in a different language, but it must never
 * disagree with the web app about what day it is or which festival falls on
 * it. Sharing the generated data is how that is guaranteed — the alternative
 * is a second copy of the month-length table in Kotlin, which would drift the
 * first time either side was corrected.
 *
 * Two files are written:
 *
 *   panchang.json     festivals, holidays and tithi — byte-identical to
 *                     src/data/calendar/panchang.json
 *   bs-calendar.json  the BS month-length table plus the epoch anchor, lifted
 *                     from nepali-date-converter so the Kotlin conversion has
 *                     the same numbers the browser uses
 *
 * It also renders the launcher icon at the five Android densities from
 * design/app-icon.html — the same source the web app's icons come from, so the
 * widget's app icon cannot drift from the PWA's. That step needs a cached
 * Chromium and is skipped with a warning if there isn't one, since the data
 * files are the part that actually matters.
 *
 * The epoch is verified here rather than trusted: BS 2000-01-01 is asserted to
 * be AD 1943-04-14, and the table is walked forward to confirm it lands where
 * the library says it should. If either check fails the export aborts, because
 * a widget that is confidently one day out is worse than no widget.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import NepaliDateDefault, { dateConfigMap } from 'nepali-date-converter'
import { findChromium, shot } from './lib/chromium.mjs'

/* The package is CommonJS, so under ESM the default import is the whole
   module.exports object and the class hangs off `.default`. Bundlers paper
   over this; plain node does not. */
const NepaliDate = NepaliDateDefault.default ?? NepaliDateDefault
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assets = join(root, 'android', 'app', 'src', 'main', 'assets')

const MONTH_KEYS = [
  'Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Aswin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
]

const years = Object.keys(dateConfigMap).map(Number).sort((a, b) => a - b)
const EPOCH_YEAR = years[0]

const epochDate = new NepaliDate(EPOCH_YEAR, 0, 1).toJsDate()
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* Check 1: the anchor is the date it is supposed to be. */
if (iso(epochDate) !== '1943-04-14') {
  console.error(`Epoch check failed: BS ${EPOCH_YEAR}-01-01 resolved to ${iso(epochDate)}, expected 1943-04-14`)
  process.exit(1)
}

/* Check 2: walking the table from the anchor agrees with the library for a
   date far from it. Catches a table that is internally consistent but offset,
   which the anchor test alone would pass. */
const probe = { year: 2083, month: 3, day: 28 }
let walked = 0
for (let y = EPOCH_YEAR; y < probe.year; y++) {
  walked += MONTH_KEYS.reduce((sum, k) => sum + dateConfigMap[String(y)][k], 0)
}
for (let m = 0; m < probe.month; m++) walked += dateConfigMap[String(probe.year)][MONTH_KEYS[m]]
walked += probe.day - 1

const walkedDate = new Date(epochDate.getTime())
walkedDate.setDate(walkedDate.getDate() + walked)
const libDate = new NepaliDate(probe.year, probe.month, probe.day).toJsDate()
if (iso(walkedDate) !== iso(libDate)) {
  console.error(`Table walk failed: BS ${probe.year}-${probe.month + 1}-${probe.day} walked to ${iso(walkedDate)} but the library says ${iso(libDate)}`)
  process.exit(1)
}

const months = {}
for (const y of years) months[y] = MONTH_KEYS.map((k) => dateConfigMap[String(y)][k])

mkdirSync(assets, { recursive: true })
writeFileSync(
  join(assets, 'bs-calendar.json'),
  JSON.stringify({
    epochBsYear: EPOCH_YEAR,
    epochAd: iso(epochDate),
    /* 0 = Sunday, matching both java.time.DayOfWeek-as-index and the web app. */
    epochWeekday: epochDate.getDay(),
    minYear: years[0],
    maxYear: years[years.length - 1],
    months,
  }),
)

const panchangSrc = join(root, 'src', 'data', 'calendar', 'panchang.json')
if (!existsSync(panchangSrc)) {
  console.error('src/data/calendar/panchang.json is missing — run `npm run calendar:data` first.')
  process.exit(1)
}
copyFileSync(panchangSrc, join(assets, 'panchang.json'))

const coverage = JSON.parse(readFileSync(panchangSrc, 'utf8')).coverage
console.log('wrote android/app/src/main/assets/')
console.log(`  bs-calendar.json  BS ${years[0]}–${years[years.length - 1]}, epoch ${iso(epochDate)} (both checks passed)`)
console.log(`  panchang.json     festivals BS ${coverage.from}–${coverage.to}`)

/* Launcher icon, from the same source as the PWA's. Android's density buckets
   want 48/72/96/144/192px for mdpi→xxxhdpi. */
const DENSITIES = [
  ['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192],
]
const chrome = findChromium()
if (!chrome) {
  console.warn('\nNo cached Chromium — launcher icons NOT rendered.')
  console.warn('The data files above are written; run `npx playwright install chromium` and re-run for icons.')
} else {
  const iconSrc = join(root, 'design', 'app-icon.html')
  const res = join(root, 'android', 'app', 'src', 'main', 'res')
  for (const [density, size] of DENSITIES) {
    const dir = join(res, `mipmap-${density}`)
    mkdirSync(dir, { recursive: true })
    shot({ chrome, url: `file://${iconSrc}`, out: join(dir, 'ic_launcher.png'), width: size, height: size, settleMs: 8000 })
  }
  console.log(`  ic_launcher.png   ${DENSITIES.map(([d]) => d).join(', ')}`)
}
