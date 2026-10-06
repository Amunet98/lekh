import { convert } from './engine'

/* Conversion at the caret rather than at the end of the text.
 *
 * The editor used to look only at the trailing run of Latin letters, so going
 * back to fix a word in the middle of a paragraph left it in Latin: the space
 * you typed after it landed, but nothing converted. These helpers do the same
 * job against the run that ends *at the caret*, wherever the caret is, and
 * report where the caret should land afterwards — the replacement is usually
 * a different length from what it replaces, so the old offset is wrong.
 *
 * Pure functions on (text, caret) so they can be tested without a DOM; the
 * hook owns the state and puts the caret back on the textarea. */

/* Letters and digits, plus the pattern's own keys: ~ * \ / ^ (see maps.ts),
   so `sa*saar`, `bas\` and `kri^ket` reach the engine whole. */
const LATIN_RUN = /[A-Za-z0-9~*\\/^]+$/

export interface Edit {
  text: string
  caret: number
}

/** The run of Latin letters that ends at the caret, or '' if there is none. */
export function pendingAt(text: string, caret: number): string {
  const m = text.slice(0, caret).match(LATIN_RUN)
  return m ? m[0] : ''
}

/**
 * Converts the run ending at the caret (or swaps in `replacement`, for a
 * chosen suggestion) and inserts `suffix` after it — a space, a danda, a
 * comma. Text after the caret is left exactly as it was.
 */
export function commitAt(text: string, caret: number, suffix = '', replacement?: string): Edit {
  const before = text.slice(0, caret)
  const after = text.slice(caret)
  const run = pendingAt(text, caret)
  const head = run
    ? before.slice(0, before.length - run.length) + (replacement ?? convert(run))
    : before
  const out = head + suffix
  return { text: out + after, caret: out.length }
}

/** Inserts `s` at the caret with no conversion. */
export function insertAt(text: string, caret: number, s: string): Edit {
  return { text: text.slice(0, caret) + s + text.slice(caret), caret: caret + s.length }
}
