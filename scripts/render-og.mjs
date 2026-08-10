#!/usr/bin/env node
/**
 * Renders design/og-image.html to public/og-image.png (1200x630).
 *
 *   npm run og
 *
 * This exists because the card hardcodes a copy of the dark palette — it is a
 * PNG, so it cannot import tokens from src/index.css. That means it goes stale
 * whenever the palette moves, and the palette has moved three times so far
 * (Paper & Ink → Ink & Slate → Ink & Glass). Nobody sees an OG image during
 * development, only inside someone else's feed, and X/LinkedIn cache it hard
 * per URL — so a stale card propagates quietly for a long time and
 * re-rendering does not retroactively fix shares that already went out.
 *
 * Hence: one command, not a remembered incantation.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'design', 'og-image.html')
const target = join(root, 'public', 'og-image.png')

/**
 * Chromium is not a dependency of this project — the binary comes from
 * whatever Playwright cached on this machine. That is fine (it saves a ~150MB
 * devDependency for a command run about once a quarter) but it does mean the
 * script has to fail with an instruction rather than ENOENT.
 *
 * Brave is deliberately not a fallback: its one-shot --screenshot flag hangs
 * rather than exiting, so it needs the whole CDP dance instead.
 */
function findChromium() {
  if (process.env.CHROME) {
    // Checked rather than trusted — an override with a typo would otherwise
    // reach execFileSync and surface as a bare ENOENT with no hint that the
    // env var was the problem.
    if (existsSync(process.env.CHROME)) return process.env.CHROME
    console.error(`CHROME is set to a path that does not exist: ${process.env.CHROME}`)
    process.exit(1)
  }

  const cache = join(homedir(), '.cache', 'ms-playwright')
  if (!existsSync(cache)) return null

  const candidates = readdirSync(cache)
    .filter((d) => d.startsWith('chromium-'))
    // Newest build first. The suffix is a Playwright revision number, so a
    // plain string sort puts chromium-999 above chromium-1234.
    .sort((a, b) => Number(b.split('-')[1] || 0) - Number(a.split('-')[1] || 0))
    .map((d) => join(cache, d, 'chrome-linux64', 'chrome'))

  return candidates.find((p) => existsSync(p)) ?? null
}

const chrome = findChromium()
if (!chrome) {
  console.error(
    'No Chromium found.\n\n' +
      'This script uses the browser Playwright caches in ~/.cache/ms-playwright.\n' +
      'Install one with:  npx playwright install chromium\n' +
      'Or point at your own:  CHROME=/path/to/chrome npm run og\n',
  )
  process.exit(1)
}

console.log(`chromium  ${chrome}`)
console.log(`rendering ${source}`)

execFileSync(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    // Without this the card renders at the host's DPI and comes out 2400x1260.
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    // What waits for the Google Fonts request. Drop it and the Devanagari
    // renders in a fallback face — which still *looks* like a card, so it is
    // the kind of breakage that ships.
    '--virtual-time-budget=8000',
    `--screenshot=${target}`,
    `file://${source}`,
  ],
  { stdio: ['ignore', 'ignore', 'inherit'], timeout: 90_000 },
)

if (!existsSync(target)) {
  console.error('Chromium exited cleanly but wrote no file.')
  process.exit(1)
}

const kb = Math.round(statSync(target).size / 1024)
console.log(`wrote     public/og-image.png (${kb} KB)`)
console.log('\nCheck the Devanagari actually rendered in Anek/Noto before committing —')
console.log('a fallback face is the failure mode that looks fine at a glance.')
