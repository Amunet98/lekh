/**
 * Shared headless-Chromium helper for the asset renderers in this directory.
 *
 * Chromium is deliberately NOT a devDependency — ~150MB for commands that run
 * a few times a year. It comes from whatever Playwright has cached on the
 * machine, which means "not installed" is a normal state that has to fail with
 * an instruction rather than an ENOENT.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Locates a usable Chromium, newest build first.
 * Honours CHROME=/path/to/chrome as an override.
 *
 * Brave is deliberately not a fallback even though it is installed on this
 * machine: its one-shot --screenshot flag hangs instead of exiting, so driving
 * it needs the whole CDP dance.
 */
export function findChromium() {
  if (process.env.CHROME) {
    // Checked rather than trusted — an override with a typo would otherwise
    // surface as a bare ENOENT with no hint that the env var was the problem.
    if (existsSync(process.env.CHROME)) return process.env.CHROME
    console.error(`CHROME is set to a path that does not exist: ${process.env.CHROME}`)
    process.exit(1)
  }

  const cache = join(homedir(), '.cache', 'ms-playwright')
  if (!existsSync(cache)) return null

  return (
    readdirSync(cache)
      .filter((d) => d.startsWith('chromium-'))
      // Newest first. The suffix is a Playwright revision number, so a plain
      // string sort would put chromium-999 above chromium-1234.
      .sort((a, b) => Number(b.split('-')[1] || 0) - Number(a.split('-')[1] || 0))
      .map((d) => join(cache, d, 'chrome-linux64', 'chrome'))
      .find((p) => existsSync(p)) ?? null
  )
}

/** Resolves a Chromium or exits with an actionable message. */
export function requireChromium() {
  const chrome = findChromium()
  if (chrome) return chrome
  console.error(
    'No Chromium found.\n\n' +
      'These renderers use the browser Playwright caches in ~/.cache/ms-playwright.\n' +
      'Install one with:  npx playwright install chromium\n' +
      'Or point at your own:  CHROME=/path/to/chrome npm run <script>\n',
  )
  process.exit(1)
}

/**
 * Screenshots a local file to a PNG at an exact pixel size.
 *
 * @param {object} o
 * @param {string} o.chrome    Path to the browser binary.
 * @param {string} o.url       file:// URL to render.
 * @param {string} o.out       Destination PNG path.
 * @param {number} o.width
 * @param {number} o.height
 * @param {number} [o.settleMs] Virtual time to burn before capturing.
 */
export function shot({ chrome, url, out, width, height, settleMs = 8000 }) {
  execFileSync(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      // Without this the capture picks up the host's DPI and comes out at 2x.
      '--force-device-scale-factor=1',
      `--window-size=${width},${height}`,
      // What waits for the Google Fonts request. Drop it and text renders in a
      // fallback face — which still *looks* right, so it is the kind of
      // breakage that ships.
      `--virtual-time-budget=${settleMs}`,
      `--screenshot=${out}`,
      url,
    ],
    { stdio: ['ignore', 'ignore', 'inherit'], timeout: 90_000 },
  )
}
