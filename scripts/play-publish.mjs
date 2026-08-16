#!/usr/bin/env node
/**
 * Uploads the already-built release AAB to a Play Console testing track.
 *
 *   npm run play:publish            # internal track (default)
 *   npm run play:publish -- closed  # or another track name
 *
 * Auth is a service account key, not the owner's own Google login — see
 * lekh-play.md for how `lekh-play-publisher@lekh-play-publish.iam.gserviceaccount.com`
 * was created and invited to Lekh Patro with only the "Release apps to
 * testing tracks" permission (no production access, no other apps). The key
 * lives outside the repo at ~/.keystores/lekh-play-publish-sa.json, next to
 * the APK signing key — same reasoning, same place.
 *
 * Expects `npm run android:release` (or `bundleRelease` directly) to have
 * already produced android/app/build/outputs/bundle/release/app-release.aab
 * with the version you want live; this script does not rebuild it.
 */
import { createReadStream, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { google } from 'googleapis'

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const KEY_PATH = process.env.PLAY_SERVICE_ACCOUNT_KEY ?? path.join(homedir(), '.keystores', 'lekh-play-publish-sa.json')
const AAB_PATH = path.join(repoRoot, 'android/app/build/outputs/bundle/release/app-release.aab')
const PACKAGE_NAME = 'np.com.bimeshpoudel.lekh'
const track = process.argv[2] ?? 'internal'

if (!existsSync(KEY_PATH)) {
  throw new Error(`Service account key not found at ${KEY_PATH} (set PLAY_SERVICE_ACCOUNT_KEY to override)`)
}
if (!existsSync(AAB_PATH)) {
  throw new Error(`No release bundle at ${AAB_PATH} — run npm run android:release first`)
}

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
})
const publisher = google.androidpublisher({ version: 'v3', auth })

const { data: edit } = await publisher.edits.insert({ packageName: PACKAGE_NAME })
const editId = edit.id

const { data: bundle } = await publisher.edits.bundles.upload({
  packageName: PACKAGE_NAME,
  editId,
  media: { mimeType: 'application/octet-stream', body: createReadStream(AAB_PATH) },
})

await publisher.edits.tracks.update({
  packageName: PACKAGE_NAME,
  editId,
  track,
  requestBody: {
    releases: [{ versionCodes: [String(bundle.versionCode)], status: 'completed' }],
  },
})

await publisher.edits.commit({ packageName: PACKAGE_NAME, editId })

console.log(`Uploaded versionCode ${bundle.versionCode} to the "${track}" track.`)
