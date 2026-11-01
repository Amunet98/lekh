// Builds src/data/wikiWords.txt: the most common words of the Nepali
// Wikipedia, most frequent first, for the Type tab's suggestion chips.
//
//   node scripts/build-wiki-words.mjs <newiki-latest-pages-articles.xml.bz2> [max, default 45000]
//
// The dump: https://dumps.wikimedia.org/newiki/latest/ . Needs bzcat.
//
// Licence: Wikipedia text is CC BY-SA 4.0. Only a list of single words is kept
// (no sentences, no articles), and the output file carries the credit and the
// licence in its header; Lekh's code stays MIT. The approach (frequency-ranked
// Wikipedia words, curated words ranked above them) is the one nepali-type by
// Chandan Shakya uses (MIT, github.com/ChandanShakya/nepali-type); this script
// is written separately and keeps nothing of its word list.

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { writeFileSync } from 'node:fs'

const [dump, maxArg] = process.argv.slice(2)
const MAX = Number(maxArg) || 45000
const MIN_COUNT = 5
if (!dump) {
  console.error('usage: node scripts/build-wiki-words.mjs <dump.xml.bz2> [max]')
  process.exit(1)
}

/* A word is a run of Devanagari letters and signs. Digits (०-९), the danda
   (। ॥) and Latin end it; zero-width joiners are dropped. */
const TOKEN = /[ऀ-ॣॱ-ॿ‌‍]+/g
/* It must open on a letter (an independent vowel or a consonant), never on a
   vowel sign, virama or nukta, which only appear mid-word in real text. */
const OPENS = /^[ऄ-हक़-ॡॲ-ॿ]/
/* Two vowel signs in a row, or a sign after a virama, is broken text. */
const BROKEN = /[ा-ौॢॣ][ा-ौॢॣ]|्[ा-्]/

const count = new Map()
let inText = false
let lines = 0
const rl = createInterface({ input: spawn('bzcat', [dump]).stdout, crlfDelay: Infinity })
for await (const raw of rl) {
  lines++
  let line = raw
  if (!inText) {
    const at = line.indexOf('<text')
    if (at === -1) continue
    inText = true
    line = line.slice(line.indexOf('>', at) + 1)
  }
  const end = line.indexOf('</text>')
  if (end !== -1) {
    line = line.slice(0, end)
    inText = false
  }
  /* Wiki markup, not prose: the namespace word of every category, image and
     file link ([[श्रेणी:…]], [[चित्र:…]]) would otherwise top the list. */
  line = line.replace(/\[\[(?:श्रेणी|चित्र|फाइल|फाईल|File|Image|Category):/g, '[[')
  for (const m of line.matchAll(TOKEN)) {
    const w = m[0].replace(/[‌‍]/g, '').normalize('NFC')
    const len = [...w].length
    if (len < 2 || len > 18 || !OPENS.test(w) || BROKEN.test(w)) continue
    count.set(w, (count.get(w) ?? 0) + 1)
  }
}

const ranked = [...count.entries()]
  .filter(([, c]) => c >= MIN_COUNT)
  .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  .slice(0, MAX)

const header = [
  `# Common words of the Nepali Wikipedia, most frequent first (${ranked.length} words).`,
  '# Source: Nepali Wikipedia (ne.wikipedia.org), from the newiki pages-articles dump,',
  `# ${new Date().toISOString().slice(0, 10)}. Wikipedia text is licensed CC BY-SA 4.0`,
  '# (https://creativecommons.org/licenses/by-sa/4.0/); this word list, derived from it,',
  '# is shared under the same licence. Built by scripts/build-wiki-words.mjs.',
]
writeFileSync('src/data/wikiWords.txt', header.join('\n') + '\n' + ranked.map(([w]) => w).join('\n') + '\n')
console.log(`${lines} lines read, ${count.size} distinct words, ${ranked.length} kept (min count ${MIN_COUNT})`)
console.log('top 40:', ranked.slice(0, 40).map(([w]) => w).join(' '))
console.log('rank 44960+:', ranked.slice(-15).map(([w, c]) => `${w}(${c})`).join(' '))
