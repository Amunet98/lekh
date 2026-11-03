#!/usr/bin/env node
/*
 * Writes android/.../res/layout/widget_preview_month.xml: the Month widget as
 * the launcher's widget picker shows it.
 *
 * Why a generated layout rather than a picture. The four day widgets use their
 * own layout as android:previewLayout, so their picker previews are drawn from
 * the same colour resources as the placed widget: the wallpaper's palette on
 * Android 12+. The Month widget cannot do that, because its day cells are
 * added at draw time (MonthRenderer, RemoteViews.addView) and its bare layout
 * is an empty grid. Until 2.0.0 it used a PNG instead, rendered on the test
 * phone, so every phone's picker showed that phone's brown wallpaper colours
 * and a spelling the calendar had since corrected (बिहि), beside four previews
 * in its own colours (owner's screenshot on One UI, 2026-11-04). This writes
 * the cells out in full instead, from the real cell layout and the bundled
 * calendar, so the Month preview takes the wallpaper's colours like the rest.
 *
 * Every picker preview shows the same sample day, SAMPLE below: the leaf,
 * tithi, moon (drawable/widget_moon_preview.xml) and festival line in the
 * day layouts' android:text placeholders say the same thing. Change it in all
 * of them or none.
 *
 * Run after changing widget_patro_month.xml, widget_month_cell.xml or the
 * sample day: `npm run android:previews`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const main = join(root, 'android/app/src/main')
const res = join(main, 'res')

// Kartik 17 2083 (Tuesday 3 Nov 2026): नवमी, कृष्ण पक्ष, रमा एकादशी in two days.
const SAMPLE = { year: 2083, month: 7, day: 17 } // month 1-based, as in panchang.json

const cal = JSON.parse(readFileSync(join(main, 'assets/bs-calendar.json'), 'utf8'))
const panchang = JSON.parse(readFileSync(join(main, 'assets/panchang.json'), 'utf8'))

const DIGITS = '०१२३४५६७८९'
const dev = (n) => String(n).replace(/\d/g, (d) => DIGITS[d])

/** Days from the table's epoch to the 1st of [year]/[month] (1-based). */
function daysToMonthStart(year, month) {
  let days = 0
  for (let y = cal.epochBsYear; y < year; y++) days += cal.months[y].reduce((a, b) => a + b, 0)
  for (let m = 0; m < month - 1; m++) days += cal.months[year][m]
  return days
}
const epoch = new Date(`${cal.epochAd}T00:00:00Z`)
const offset = daysToMonthStart(SAMPLE.year, SAMPLE.month)
const first = new Date(epoch.getTime() + offset * 86400000)
const firstWeekday = (cal.epochWeekday + offset) % 7 // 0 = Sunday, as NepaliCalendar
if (first.getUTCDay() !== firstWeekday) throw new Error('epoch weekday disagrees with the AD date')
const length = cal.months[SAMPLE.year][SAMPLE.month - 1]

// NepaliCalendar.isWeeklyOff: Saturday always, Sunday from Chaitra 23 2082.
if (SAMPLE.year < 2083) throw new Error('sample before 2083: port the dated Sunday rule before using it')
const month = panchang.years[SAMPLE.year][SAMPLE.month]
const holidays = new Set(month.h)
// WidgetRenderer.majorOnly: a day is festive if it has a name that is not a bare tithi.
const TITHIS = new Set(['प्रतिपदा', 'द्दितीया', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी', 'षष्ठी', 'सप्तमी',
  'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'औशी', 'औंसी', 'पुर्णिमा', 'पूर्णिमा'])
/** Panchang.splitTopLevel: commas inside brackets do not split. */
function splitTopLevel(text) {
  const out = []
  let depth = 0
  let cur = ''
  for (const ch of text) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim()).filter(Boolean)
}
const festive = (day) => splitTopLevel(month.f[day] ?? '').some((n) => !TITHIS.has(n))

// The cell, minus its comment, namespace and ids (a preview needs none).
const cellXml = readFileSync(join(res, 'layout/widget_month_cell.xml'), 'utf8')
  .replace(/<\?xml[^>]*>\s*/, '')
  .replace(/<!--[\s\S]*?-->\s*/g, '')
  .replace(/\s+xmlns:android="[^"]*"/, '')
  .replace(/\s+android:id="@\+id\/[^"]*"/g, '')
  .trim()

function cell(day) {
  let x = cellXml
  const inMonth = day >= 1 && day <= length
  const ad = inMonth ? new Date(first.getTime() + (day - 1) * 86400000).getUTCDate() : ''
  x = x.replace('android:text="१७"', `android:text="${inMonth ? dev(day) : ''}"`)
  x = x.replace('android:text="3"', `android:text="${ad}"`)
  if (!inMonth) return x
  const weekday = (firstWeekday + day - 1) % 7
  const off = weekday === 6 || weekday === 0 || holidays.has(day)
  if (off) x = x.replace(/android:textColor="@color\/widget_(day|week_label)"/g, 'android:enabled="false" $&')
  if (day === SAMPLE.day) {
    // MonthRenderer: today's BS date sits on a filled circle in widget_head, in widget_on_head.
    x = x.replace('android:textColor="@color/widget_day"',
      'android:background="@drawable/widget_month_today" android:textColor="@color/widget_on_head"')
  }
  if (festive(day)) x = x.replace('android:visibility="invisible"', 'android:visibility="visible"')
  return x
}

const indent = (text, pad) => text.split('\n').map((l) => pad + l).join('\n')
const rows = Math.ceil((firstWeekday + length) / 7)
let out = readFileSync(join(res, 'layout/widget_patro_month.xml'), 'utf8')
out = out.replace(/<!--[\s\S]*?-->/, `<!-- GENERATED by scripts/render-widget-previews.mjs from widget_patro_month.xml
     and widget_month_cell.xml; do not edit, run the script. The Month widget's
     android:previewLayout: ${SAMPLE.year}/${SAMPLE.month}/${SAMPLE.day}, the sample day every picker
     preview shows, with the cells written out because the real layout's are
     added at draw time. -->`)
for (let r = 0; r < 6; r++) {
  const empty = new RegExp(`\\s*<LinearLayout android:id="@\\+id/widget_m_row${r}"[^>]*/>`)
  if (!empty.test(out)) throw new Error(`row ${r} not found in widget_patro_month.xml`)
  if (r >= rows) { out = out.replace(empty, ''); continue }
  const cells = []
  for (let c = 0; c < 7; c++) cells.push(indent(cell(r * 7 + c - firstWeekday + 1), '        '))
  out = out.replace(empty, `\n    <LinearLayout android:layout_width="match_parent"
        android:layout_height="0dp" android:layout_weight="1" android:orientation="horizontal">
${cells.join('\n')}
    </LinearLayout>`)
}
writeFileSync(join(res, 'layout/widget_preview_month.xml'), out)
console.log(`wrote widget_preview_month.xml: ${rows} rows, first weekday ${firstWeekday}, ${length} days`)
