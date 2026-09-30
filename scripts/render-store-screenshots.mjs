#!/usr/bin/env node
/**
 * Renders design/store-screenshots.html to design/play/0N-<slide>.png
 * (1440x2560, 9:16), one PNG per slide.
 *
 *   npm run play:screenshots
 *
 * The phones inside show real captures from design/play/raw/ — recapture those
 * from the device when the UI changes (how is written at the top of the HTML),
 * then re-run this. Play rejects screenshots with an alpha channel, so the PNGs
 * are flattened to RGB after rendering.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireChromium, shot } from './lib/chromium.mjs'

const SLIDES = ['type', 'letters', 'patro', 'dark', 'translate', 'widgets', 'private']

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'design', 'store-screenshots.html')
const outDir = join(root, 'design', 'play')
mkdirSync(outDir, { recursive: true })

const chrome = requireChromium()
console.log(`chromium  ${chrome}`)

SLIDES.forEach((slide, i) => {
  const name = `${String(i + 1).padStart(2, '0')}-${slide}.png`
  const target = join(outDir, name)
  shot({ chrome, url: `file://${source}#${slide}`, out: target, width: 1440, height: 2560 })
  if (!existsSync(target)) {
    console.error(`Chromium exited cleanly but wrote no ${name}.`)
    process.exit(1)
  }
  // Headless Chromium writes RGBA; Play wants 24-bit.
  execFileSync('python3', ['-c', `from PIL import Image; Image.open('${target}').convert('RGB').save('${target}', optimize=True)`])
  console.log(`wrote     design/play/${name} (${Math.round(statSync(target).size / 1024)} KB)`)
})
