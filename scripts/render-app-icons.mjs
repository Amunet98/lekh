#!/usr/bin/env node
/**
 * Renders design/app-icon.html to every app-icon PNG in public/.
 *
 *   npm run app-icons
 *
 * These used to be hand-made PNGs with no source in the repo, which is why the
 * indigo caret survived a whole redesign: there was nothing to re-render, so
 * repainting them meant editing binaries. One HTML source and this script mean
 * a palette change is a palette change.
 *
 * favicon.ico is NOT generated here: it is a container holding several images
 * at once, which Chromium's --screenshot cannot write. It is assembled from
 * the 512 tile in a separate one-off step — see design/README.md. The two PNG
 * favicons below are what index.html actually links; the .ico only serves
 * clients that probe /favicon.ico directly, so it rarely needs redoing.
 */
import { existsSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireChromium, shot } from './lib/chromium.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'design', 'app-icon.html')

/* The filenames here must stay in step with the `icons` array in
 * vite.config.ts and the <link rel="icon"> tags in index.html.
 *
 * `maskable` selects the padded variant via the hash — see the :target rules
 * in the source file. Everything else is full-bleed. */
const ICONS = [
  { file: 'android-chrome-512x512.png', size: 512 },
  { file: 'android-chrome-192x192.png', size: 192 },
  { file: 'maskable-icon-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-32x32.png', size: 32 },
  { file: 'favicon-16x16.png', size: 16 },
]

const chrome = requireChromium()
console.log(`chromium  ${chrome}`)

for (const { file, size, maskable } of ICONS) {
  const out = join(root, 'public', file)
  shot({
    chrome,
    url: `file://${source}${maskable ? '#maskable' : ''}`,
    out,
    width: size,
    height: size,
    // Anek Devanagari comes from Google Fonts. Without a real budget here the
    // glyph renders in a fallback face, which still looks like a letter — the
    // kind of breakage that ships.
    settleMs: 8000,
  })
  if (!existsSync(out)) {
    console.error(`Chromium exited cleanly but wrote no file for "${file}".`)
    process.exit(1)
  }
  console.log(`wrote     public/${file} (${statSync(out).size} B)`)
}

console.log('\nCheck the glyph rendered in Anek and not a fallback face, and that')
console.log('maskable-icon-512x512.png has visibly more padding than the 512 tile.')
