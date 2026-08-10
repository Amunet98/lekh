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
import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireChromium, shot } from './lib/chromium.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'design', 'og-image.html')
const target = join(root, 'public', 'og-image.png')

const chrome = requireChromium()
console.log(`chromium  ${chrome}`)
console.log(`rendering ${source}`)

shot({ chrome, url: `file://${source}`, out: target, width: 1200, height: 630 })

if (!existsSync(target)) {
  console.error('Chromium exited cleanly but wrote no file.')
  process.exit(1)
}

const kb = Math.round(statSync(target).size / 1024)
console.log(`wrote     public/og-image.png (${kb} KB)`)
console.log('\nCheck the Devanagari actually rendered in Anek/Noto before committing —')
console.log('a fallback face is the failure mode that looks fine at a glance.')
