import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { isNativeApp } from './androidApp'
import { shareFile } from './share'

/* One way to hand the user a file, because there are two mechanisms and only
 * one of them works in each place.
 *
 * On the web, an <a download> click. Inside the Android app that click goes
 * nowhere: a WebView with no DownloadListener registered drops blob: and
 * data: downloads on the floor, silently — no error, no file, nothing. Every
 * export in the app (.txt, .docx, the calendar's .ics) was dead in the APK
 * while working perfectly in the browser tab next to it.
 *
 * The native path writes to the app's own cache directory and hands the URI
 * to the system share sheet, which is how Android expects an app to give you
 * a file: "save to Drive / Files / send to someone" is the same gesture. It
 * needs no storage permission, and Capacitor's Share plugin already resolves
 * the URI through the FileProvider declared in AndroidManifest.xml
 * (cache-path in res/xml/file_paths.xml is what covers Directory.Cache). */

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/* Filesystem.writeFile takes base64 for anything that isn't plain text, and
 * .docx is a zip — so everything goes through one binary path rather than
 * branching on type and getting it wrong for one of them. */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.onload = () => {
      const result = String(reader.result)
      // "data:<mime>;base64,XXXX" — the plugin wants only the payload.
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * Give the user a file: a download in the browser, the share sheet in the app.
 * Rejects if the write or the share genuinely failed; a dismissed share sheet
 * resolves quietly (see share.ts).
 */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (!isNativeApp()) {
    downloadBlob(blob, filename)
    return
  }
  /* An APK older than these plugins is running this code — server.url means
     the web layer updates without it. Say so rather than calling into a
     bridge that isn't there, whose own error names a plugin the user has
     never heard of. */
  if (!Capacitor.isPluginAvailable('Filesystem') || !Capacitor.isPluginAvailable('Share')) {
    throw new Error('This build of the app cannot save files yet — update it from the Play Store.')
  }
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await toBase64(blob),
    directory: Directory.Cache,
  })
  await shareFile(uri, filename)
}
