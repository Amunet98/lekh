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
 * Re-run it whenever the local signing key changes — this re-derives that
 * half automatically. The Play App Signing half (published 2026-08-16) is
 * NOT re-derived; it's hardcoded as PLAY_APP_SIGNING_FINGERPRINT below,
 * because Google generates and holds that key server-side and there is no
 * local artifact to read it from. Update the constant by hand if it's ever
 * rotated in Play Console → Setup → App integrity.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const apk = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
const APPLICATION_ID = 'np.com.bimeshpoudel.lekh'

/* Play App Signing's own cert(s) — the CLASSICAL SHA-256 fingerprint(s),
 * captured from Protected with Play → App signing → "Classical key" (current)
 * and → "Previous app signing keys" (any prior ones). Play generates and owns
 * this key server-side the moment you accept its Terms of Service during app
 * creation — there is no "use my existing key" option in the current console
 * UI, only after the fact via a Google-mediated support request. So these
 * fingerprints are never re-derivable from a local build the way the one
 * below is; they have to be hardcoded here or every re-run of this script
 * silently drops Play-installed users back to Chrome's address bar.
 *
 * THIS ROTATES SILENTLY, AND OLD KEYS CAN STAY LIVE FOR A WHILE AFTER
 * ROTATION. Play migrated this app to a dual classical + post-quantum
 * signing key ("Quantum-ready (beta)") on its own, which minted a new
 * classical fingerprint without any action on our side. The mistake the
 * first time around: assuming Play immediately re-signs every already-
 * published release with the new key and replacing the old fingerprint
 * outright. It doesn't — a release that hasn't been re-uploaded since the
 * rotation (confirmed here by Play Console's own "Updated on" date predating
 * the rotation) can keep being served signed with the OLD key indefinitely.
 * KEEP BOTH FINGERPRINTS LISTED, indefinitely, unless a fresh upload is
 * confirmed to be signed with only the new one. If it happens again: Protected
 * with Play → App signing → "App signing key" → Classical key → SHA-256
 * certificate fingerprint is the current one (add it); "Previous app signing
 * keys" holds the older ones (keep them) — not the post-quantum column
 * either way, Digital Asset Links only checks classical. */
const PLAY_APP_SIGNING_FINGERPRINTS = [
  '34:79:6F:C2:DA:0F:38:AC:03:25:CD:27:03:C3:E9:AF:65:05:04:56:E9:C0:B7:FE:3C:D7:F1:F2:66:A7:F7:DB',
  '83:99:1B:6F:DA:5D:33:89:DE:CD:BE:AC:38:9C:78:BE:E3:A9:7A:B9:79:5A:6C:09:BA:05:4D:A9:8E:11:CD:D0',
]

if (!existsSync(apk)) {
  console.error(`No release APK at ${apk}\nBuild one first:  cd android && ./gradlew assembleRelease`)
  process.exit(1)
}

/* apksigner is the source of truth: it reports the certificate the APK is
   actually signed with, which is the thing Chrome will compare against.
   Picked from whichever build-tools version is actually installed, highest
   first, rather than a version pinned in this script — the SDK's installed
   versions change independently of this repo (an SDK cleanup, a bump to
   compileSdk in android/app/build.gradle.kts) and a hardcoded version here
   just goes stale. */
const buildTools = join(process.env.ANDROID_HOME || join(process.env.HOME, 'Android/Sdk'), 'build-tools')
const buildToolsVersion = existsSync(buildTools)
  ? readdirSync(buildTools)
      .filter((v) => existsSync(join(buildTools, v, 'apksigner')))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0]
  : undefined
if (!buildToolsVersion) {
  console.error(`No apksigner found under ${buildTools} — set ANDROID_HOME or install an Android build-tools package`)
  process.exit(1)
}
const apksigner = join(buildTools, buildToolsVersion, 'apksigner')

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
      sha256_cert_fingerprints: [fingerprint, ...PLAY_APP_SIGNING_FINGERPRINTS],
    },
  },
]

const dest = join(root, 'public', '.well-known')
mkdirSync(dest, { recursive: true })
writeFileSync(join(dest, 'assetlinks.json'), JSON.stringify(statements, null, 2) + '\n')

console.log('wrote public/.well-known/assetlinks.json')
console.log(`  package            ${APPLICATION_ID}`)
console.log(`  local fingerprint  ${fingerprint}`)
for (const fp of PLAY_APP_SIGNING_FINGERPRINTS) {
  console.log(`  Play fingerprint   ${fp} (hardcoded, not from this build)`)
}
console.log('\nIt must be served at https://lekh-gamma.vercel.app/.well-known/assetlinks.json')
console.log('as application/json. Verify after deploying — a 404 here is silent:')
console.log('  the app still works, it just shows Chrome\'s address bar.')
