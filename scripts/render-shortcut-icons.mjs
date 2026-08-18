#!/usr/bin/env node
/**
 * Renders design/shortcut-icons.html to public/shortcut-{name}.png (192x192).
 *
 *   npm run icons
 *
 * A manifest `shortcuts` entry without its own `icons` array gets a blank grey
 * placeholder in the Android long-press sheet — the app icon is NOT used as a
 * fallback. That is what these are for.
 *
 * 192 rather than the 96 the docs suggest: the sheet draws them at roughly
 * 24dp, and on a 3x screen 96 is already soft.
 */
import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireChromium, shot } from './lib/chromium.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'design', 'shortcut-icons.html')

// Must stay in step with the `shortcuts` array in vite.config.ts — these are
// the hash ids in the source file and the filenames the manifest points at.
const ICONS = ['type', 'translate', 'calendar']

const chrome = requireChromium()
console.log(`chromium  ${chrome}`)

for (const name of ICONS) {
  const out = join(root, 'public', `shortcut-${name}.png`)
  shot({
    chrome,
    url: `file://${source}#${name}`,
    out,
    width: 192,
    height: 192,
    // No webfonts in these — they are pure SVG paths, so there is nothing to
    // wait for and an 8s budget would just be 8s of nothing.
    settleMs: 1200,
  })
  if (!existsSync(out)) {
    console.error(`Chromium exited cleanly but wrote no file for "${name}".`)
    process.exit(1)
  }
  console.log(`wrote     public/shortcut-${name}.png (${statSync(out).size} B)`)
}

console.log('\nCheck they are actually all different before committing — the')
console.log('hash selector fails open to "type", so a typo yields identical files.')
