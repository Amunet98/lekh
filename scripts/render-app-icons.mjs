#!/usr/bin/env node
/**
 * Renders the logo masters in design/logo/ to every app-icon raster.
 *
 *   npm run app-icons
 *
 * The masters are flat SVG paths (see design/logo/build_mark.py), so this
 * needs no browser and no web font: sharp rasterises them with librsvg. The
 * old source was an HTML page setting ले in Anek Devanagari from Google Fonts,
 * which needed a cached Chromium and an 8-second font budget, and failed
 * quietly into a fallback face when either was missing.
 *
 * Writes:
 *   public/            PWA + favicon PNGs and favicon.ico
 *   android/…/mipmap-* legacy launcher PNGs (unused on API 26+, where the
 *                      adaptive icon in mipmap-anydpi-v26 wins — kept for
 *                      tooling that reads them)
 *   design/play/icon-512.png  the Play listing icon (uploaded by hand)
 *
 * The filenames in public/ must stay in step with the `icons` array in
 * vite.config.ts and the <link rel="icon"> tags in index.html.
 */
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const logo = (f) => join(root, 'design', 'logo', f)
const res = join(root, 'android', 'app', 'src', 'main', 'res')

/* `any` icons are full-bleed: launchers and iOS cut their own shape, and
 * pre-rounding just leaves dark corners inside it. The favicon is the one
 * rounded tile, with the mark as large as it goes — legibility beats margin
 * at 16 px. */
const ICONS = [
  { out: join(root, 'public', 'android-chrome-512x512.png'), src: 'app-icon.svg', size: 512 },
  { out: join(root, 'public', 'android-chrome-192x192.png'), src: 'app-icon.svg', size: 192 },
  { out: join(root, 'public', 'maskable-icon-512x512.png'), src: 'app-icon-maskable.svg', size: 512 },
  { out: join(root, 'public', 'apple-touch-icon.png'), src: 'app-icon.svg', size: 180 },
  { out: join(root, 'public', 'favicon-32x32.png'), src: 'favicon.svg', size: 32 },
  { out: join(root, 'public', 'favicon-16x16.png'), src: 'favicon.svg', size: 16 },
  { out: join(root, 'design', 'play', 'icon-512.png'), src: 'app-icon.svg', size: 512 },
  ...[['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]].map(([d, size]) => ({
    out: join(res, `mipmap-${d}`, 'ic_launcher.png'),
    src: 'app-icon.svg',
    size,
  })),
]

/* librsvg rasterises at 72 dpi of the SVG's own 256px box; render at a
 * density that lands at or above the target, then downscale, so small sizes
 * are resampled rather than drawn straight onto a coarse grid. */
const render = (src, size) =>
  sharp(readFileSync(logo(src)), { density: Math.max(72, (72 * size * 2) / 256) })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer()

for (const { out, src, size } of ICONS) {
  writeFileSync(out, await render(src, size))
  console.log(`wrote  ${relative(root, out)}  ${size}px  (${statSync(out).size} B)`)
}

/* favicon.ico: an ICONDIR header, one 16-byte entry per image, then the PNGs
 * themselves. PNG-in-ICO is valid since Vista and every current browser
 * reads it, so no BMP encoding is needed. */
const sizes = [16, 32, 48]
const pngs = await Promise.all(sizes.map((s) => render('favicon.svg', s)))
const head = Buffer.alloc(6 + 16 * sizes.length)
head.writeUInt16LE(0, 0)
head.writeUInt16LE(1, 2) // type: icon
head.writeUInt16LE(sizes.length, 4)
let offset = head.length
sizes.forEach((s, i) => {
  const e = 6 + 16 * i
  head.writeUInt8(s, e) // width (0 would mean 256)
  head.writeUInt8(s, e + 1)
  head.writeUInt16LE(1, e + 4) // colour planes
  head.writeUInt16LE(32, e + 6) // bits per pixel
  head.writeUInt32LE(pngs[i].length, e + 8)
  head.writeUInt32LE(offset, e + 12)
  offset += pngs[i].length
})
const ico = join(root, 'public', 'favicon.ico')
writeFileSync(ico, Buffer.concat([head, ...pngs]))
console.log(`wrote  ${relative(root, ico)}  ${sizes.join('/')}px`)

console.log('\nThe Android adaptive icon (vector) comes from build_mark.py, not from here.')
console.log('design/play/icon-512.png is NOT uploaded by play:publish — replace it in the Console.')
