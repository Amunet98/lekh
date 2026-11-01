// Scores a translation run against eval/class3-4-daily.tsv.
//
//   node eval/score.mjs results.json [label]
//
// results.json: [{ dir: 'en-ne' | 'ne-en', en, ne, out }]. The score is chrF
// (character n-gram F-score, n = 1..6, beta = 2; Popović 2015), which suits
// Nepali better than word-level BLEU: a right word with a different ending
// (गर / गर्नुहोस्, the familiar and polite forms of the same verb) still
// earns most of its credit instead of none. 0-100, higher is better. Each
// sentence is short, so read the per-sentence list as well as the average.

import { readFileSync } from 'node:fs'

const norm = (s) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[।॥.,!?;:"'“”‘’()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function ngrams(s, n) {
  const m = new Map()
  const chars = [...s.replace(/ /g, '')]
  for (let i = 0; i + n <= chars.length; i++) {
    const g = chars.slice(i, i + n).join('')
    m.set(g, (m.get(g) ?? 0) + 1)
  }
  return m
}

export function chrF(hyp, ref, maxN = 6, beta = 2) {
  const h = norm(hyp)
  const r = norm(ref)
  let p = 0
  let rc = 0
  let k = 0
  for (let n = 1; n <= maxN; n++) {
    const hg = ngrams(h, n)
    const rg = ngrams(r, n)
    const hTot = [...hg.values()].reduce((a, b) => a + b, 0)
    const rTot = [...rg.values()].reduce((a, b) => a + b, 0)
    if (!hTot || !rTot) continue
    let match = 0
    for (const [g, c] of hg) match += Math.min(c, rg.get(g) ?? 0)
    p += match / hTot
    rc += match / rTot
    k++
  }
  if (!k) return 0
  p /= k
  rc /= k
  if (!p && !rc) return 0
  return (100 * (1 + beta * beta) * p * rc) / (beta * beta * p + rc)
}

if (process.argv[1]?.endsWith('score.mjs')) {
  const [file, label = file] = process.argv.slice(2)
  const results = JSON.parse(readFileSync(file, 'utf8'))
  for (const dir of ['en-ne', 'ne-en']) {
    const rows = results.filter((r) => r.dir === dir)
    if (!rows.length) continue
    const scored = rows.map((r) => ({ ...r, score: chrF(r.out, dir === 'en-ne' ? r.ne : r.en) }))
    const avg = scored.reduce((a, r) => a + r.score, 0) / scored.length
    const exact = scored.filter((r) => norm(r.out) === norm(dir === 'en-ne' ? r.ne : r.en)).length
    console.log(`\n${label} · ${dir} · ${rows.length} sentences · chrF ${avg.toFixed(1)} · exact ${exact}`)
    for (const r of [...scored].sort((a, b) => a.score - b.score).slice(0, 12)) {
      const src = dir === 'en-ne' ? r.en : r.ne
      const ref = dir === 'en-ne' ? r.ne : r.en
      console.log(`  ${r.score.toFixed(0).padStart(3)}  ${src}  →  ${r.out}   (teacher: ${ref})`)
    }
  }
}
