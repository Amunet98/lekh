#!/usr/bin/env node
/**
 * Renders design/feature-graphic.html to design/play/feature-graphic.png (1024x500).
 *
 *   npm run play:feature
 *
 * The Play Store's feature graphic, which sits at the top of the listing. Same
 * staleness problem as the OG card: it hardcodes a copy of the dark palette
 * because a PNG cannot import tokens from src/index.css.
 *
 * Output goes to design/play/ and NOT public/. Anything in public/ is served at
 * the site root and swept into the service worker's precache, so a store asset
 * living there would be downloaded by every visitor to pay for a listing image
 * none of them will ever see.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireChromium, shot } from './lib/chromium.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'design', 'feature-graphic.html')
const outDir = join(root, 'design', 'play')
const target = join(outDir, 'feature-graphic.png')

mkdirSync(outDir, { recursive: true })

const chrome = requireChromium()
console.log(`chromium  ${chrome}`)
console.log(`rendering ${source}`)

shot({ chrome, url: `file://${source}`, out: target, width: 1024, height: 500 })

if (!existsSync(target)) {
  console.error('Chromium exited cleanly but wrote no file.')
  process.exit(1)
}

const kb = Math.round(statSync(target).size / 1024)
console.log(`wrote     design/play/feature-graphic.png (${kb} KB)`)
console.log('\nCheck the Devanagari rendered in Anek/Noto and not a fallback —')
console.log('a substituted face still looks plausible, which is how it ships wrong.')
