import type { RefObject } from 'react'
import { tick } from '../../lib/haptics'
import { ToolIcon } from './ToolIcons'

/* The ✕ inside a short field: an amount, a search. Tools has two kinds of
 * clear, matched to how much is lost:
 *
 *  - a field like this holds a number or a word, quicker to retype than to
 *    undo, so it gets the platform's own idiom — a small ✕ at the end of the
 *    field, there only while the field has something in it;
 *  - a box that holds pasted text (Preeti) gets the Type and Translate
 *    tabs' Clear, which turns into Undo clear for a few seconds.
 *
 * Focus goes back into the field afterwards, because the next thing anyone
 * does after clearing a field is type into it — and on a phone, a clear that
 * drops focus also drops the keyboard and makes them tap again. The visible
 * mark is small, the target is the full 44px. */
export function ClearField({
  show,
  what,
  onClear,
  inputRef,
}: {
  show: boolean
  what: string
  onClear: () => void
  inputRef: RefObject<HTMLInputElement | null>
}) {
  if (!show) return null
  return (
    <button
      type="button"
      className="clear-field"
      aria-label={`Clear ${what}`}
      onClick={() => {
        tick()
        onClear()
        inputRef.current?.focus()
      }}
    >
      <span className="clear-field__mark" aria-hidden="true">
        <ToolIcon name="x" size={14} />
      </span>
    </button>
  )
}
