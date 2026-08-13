#!/usr/bin/env node
/**
 * Writes public/.well-known/assetlinks.json from the signing certificate of
 * the built release APK.
 *
 *   npm run assetlinks
 *
 * This is the site's half of the Digital Asset Links handshake. The APK
 * declares which site it claims (see res/values/twa.xml); this file declares
 * which app the site trusts. If the two disagree — or if this file is missing,
 * stale, or served with the wrong content type — Chrome falls back to showing
 * its address bar and the Trusted Web Activity looks like a browser tab with
 * extra steps. Nothing errors; it just quietly stops being an app.
 *
 * Generated from the APK rather than typed, because the fingerprint is 32
 * bytes of hex that nobody can proofread, and because reading it from the
 * artifact proves it matches what actually shipped rather than what a keystore
 * happened to contain.
 *
 * Re-run it whenever the signing key changes. If you ever publish through Play
 * with Play App Signing, Google re-signs the app and you must ADD their
 * fingerprint here too — the array holds more than one on purpose.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
const APPLICATION_ID = 'np.com.bimeshpoudel.lekh'

if (!existsSync(apk)) {
  console.error(`No release APK at ${apk}\nBuild one first:  cd android && ./gradlew assembleRelease`)
  process.exit(1)
}

/* apksigner is the source of truth: it reports the certificate the APK is
   actually signed with, which is the thing Chrome will compare against. */
const buildTools = join(process.env.ANDROID_HOME || join(process.env.HOME, 'Android/Sdk'), 'build-tools')
const apksigner = join(buildTools, '35.0.0', 'apksigner')
if (!existsSync(apksigner)) {
  console.error(`apksigner not found at ${apksigner} — set ANDROID_HOME or install build-tools;35.0.0`)
  process.exit(1)
}

const out = execFileSync(apksigner, ['verify', '--print-certs', apk], { encoding: 'utf8' })
const match = /Signer #1 certificate SHA-256 digest:\s*([0-9a-f]{64})/i.exec(out)
if (!match) {
  console.error('Could not read a SHA-256 digest from apksigner. Is the APK signed?\n' + out)
  process.exit(1)
}

/* Digital Asset Links wants uppercase hex in colon-separated byte pairs, not
   the bare hex string apksigner prints. */
const fingerprint = match[1].toUpperCase().match(/.{2}/g).join(':')

const statements = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: APPLICATION_ID,
      sha256_cert_fingerprints: [fingerprint],
    },
  },
]

const dest = join(root, 'public', '.well-known')
mkdirSync(dest, { recursive: true })
writeFileSync(join(dest, 'assetlinks.json'), JSON.stringify(statements, null, 2) + '\n')

console.log('wrote public/.well-known/assetlinks.json')
console.log(`  package     ${APPLICATION_ID}`)
console.log(`  fingerprint ${fingerprint}`)
console.log('\nIt must be served at https://lekh-gamma.vercel.app/.well-known/assetlinks.json')
console.log('as application/json. Verify after deploying — a 404 here is silent:')
console.log('  the app still works, it just shows Chrome\'s address bar.')
