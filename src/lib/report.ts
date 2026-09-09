/* The bug report a tester can hand over, composed on the device.
 *
 * Everything here is already known to the page — no permissions are asked for
 * and nothing is sent. The one job is to answer, without an exchange of
 * messages, the questions every report otherwise takes three replies to
 * settle: which build, which shell, which Android, was it online, and did
 * anything actually throw.
 *
 * Nothing typed, translated or opened appears in it. See lastError.ts.
 */
import { formatErrors } from './lastError'
import { getNativeInfo, type NativeInfo } from './nativeInfo'

export const REPORT_EMAIL = 'social@bimeshpoudel.com.np'

function androidVersion(ua: string): string {
  return /Android (\d+(?:\.\d+)?)/.exec(ua)?.[1] ?? ''
}

/* The two numbers, side by side, in the order they are asked about. The app
   version is absent in a browser, which is itself the answer to "where was
   this running".
 *
 * Takes the info rather than reading the store, so the rendered version lines
 * can pass what useNativeInfo gave them and re-render when it lands, while the
 * report — composed on demand, long after — reads the store directly. One
 * format, two clocks. */
export function versionLine(native: NativeInfo | null): string {
  const web = `web build ${__APP_VERSION__}`
  return native ? `${web} · app ${native.version} (${native.build})` : web
}

export function buildReport(): string {
  let ua = ''
  let lang = ''
  let online = ''
  let theme = ''
  let screen = ''
  try {
    ua = navigator.userAgent
    lang = navigator.language
    online = navigator.onLine ? 'yes' : 'no'
    theme = document.documentElement.dataset.theme ?? 'system'
    screen = `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`
  } catch {
    // A restricted context can refuse any of these. A partial report still
    // beats none, so nothing here is allowed to throw the whole thing away.
  }

  const android = androidVersion(ua)
  const native = getNativeInfo()

  return [
    'Lekh Patro — report',
    '',
    `Version:  ${versionLine(native)}`,
    `Running:  ${native ? 'Android app' : 'browser'}`,
    /* null, not '' — the blank lines in this list are deliberate and would be
       filtered out alongside an omitted row if both used the same value. */
    android ? `Android:  ${android}` : null,
    `Screen:   ${screen}`,
    `Theme:    ${theme}`,
    `Online:   ${online}`,
    `Language: ${lang}`,
    `When:     ${new Date().toString()}`,
    `Device:   ${ua}`,
    '',
    'Errors:',
    formatErrors(),
    '',
    'What happened:',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n')
}

/* Secondary to Copy, deliberately — see ReportRow. Composed rather than
   opened here so the caller decides whether to offer it at all. */
export function reportMailto(body: string): string {
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent('Lekh Patro — report')}&body=${encodeURIComponent(body)}`
}
