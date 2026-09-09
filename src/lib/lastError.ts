/* The last few errors, kept in memory so a bug report can carry them.
 *
 * This app has no telemetry and is not getting any: a crash reporter would add
 * a network host to something whose whole pitch is running on-device, and
 * changing what leaves the phone means redeclaring Data Safety. So the errors
 * are held here, on the device, and go nowhere until someone taps Copy in
 * About and pastes them somewhere themselves.
 *
 * Both listeners matter, and neither is what an error boundary catches. React
 * boundaries see errors thrown during render — they see nothing thrown from an
 * event handler, a promise, or the Capacitor bridge, which is where most of
 * this app actually lives: OCR, the translation fetch, the calendar refresh.
 * Those are exactly the failures a tester would otherwise describe as "it just
 * didn't do anything".
 *
 * Messages and stacks only. Never the editor's contents, and never anything
 * that was typed or translated — the report is meant to be pasteable into a
 * chat without the sender having to read it first.
 */

interface Recorded {
  at: string
  what: string
  where: string
}

/* Three. Enough to show a repeating failure repeating, short enough that the
   whole report still fits in a message box. The oldest falls off. */
const LIMIT = 3
const errors: Recorded[] = []

function describe(value: unknown): { what: string; where: string } {
  if (value instanceof Error) {
    /* First line of the stack after the message — the frame that threw. The
       whole stack is minified bundle offsets and would be most of the report
       for something nobody can read anyway. */
    const frame = value.stack?.split('\n').slice(1).find((l) => l.trim())
    return {
      what: `${value.name}: ${value.message}`,
      where: frame?.trim() ?? '',
    }
  }
  try {
    return { what: String(value), where: '' }
  } catch {
    return { what: '(unprintable)', where: '' }
  }
}

export function recordError(value: unknown, where?: string): void {
  const { what, where: frame } = describe(value)
  errors.push({
    /* Local time, not an ISO stamp. Someone reading a pasted report is
       matching it against "it broke a minute ago", not against a log. */
    at: new Date().toLocaleTimeString(),
    what,
    where: where ?? frame,
  })
  if (errors.length > LIMIT) errors.shift()
}

/** Oldest first. Read-only — the report can be copied more than once. */
export function readErrors(): readonly Recorded[] {
  return errors
}

export function formatErrors(): string {
  if (errors.length === 0) return 'none recorded'
  return errors
    .map(({ at, what, where }) => `  ${at}  ${what}${where ? `\n              ${where}` : ''}`)
    .join('\n')
}

/* Called once from main.tsx, before render. Not in an effect: an error thrown
   while the tree is still mounting is precisely one worth having. */
export function watchForErrors(): void {
  try {
    window.addEventListener('error', (e) => {
      /* A failed <img>/<script> load fires this too, with no error object and
         a target that is the element. Those are not app faults and would push
         the real ones out of a three-slot buffer. */
      if (!(e instanceof ErrorEvent)) return
      recordError(e.error ?? e.message, e.filename ? `${e.filename}:${e.lineno}` : undefined)
    })
    window.addEventListener('unhandledrejection', (e) => {
      recordError(e.reason, 'unhandled rejection')
    })
  } catch {
    // No window, or listeners refused. The report simply says none recorded.
  }
}
