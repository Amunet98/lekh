import type { TranslateState } from '../../hooks/useTranslateState'
import './translate.css'

interface TranslateRunProps {
  t: TranslateState
}

/* The button that actually translates, and the reason it is its own component
 * sitting inside .translate-panes rather than in TranslateActions below them.
 *
 * On-device mode is the only mode with a button at all — online translates on a
 * debounce as you type — so this is the one control that turns what you wrote
 * into an answer, and it was rendered after the output pane and after that
 * pane's copy and share row. The reading order on a phone came out as: pick
 * languages, pick engine, type, read an empty answer box, copy, share, and
 * only then the thing to press. Watched on a device: you type, and then you
 * scroll down past the blank result looking for the verb.
 *
 * It now sits between the two panes, which on a phone is directly under the
 * text it acts on and before the box it fills. On a desktop the grid is two
 * columns, so `order` puts it back on its own full-width row underneath both
 * of them — exactly where it has always been there, because with the panes
 * side by side the button is already next to the input.
 */
export function TranslateRun({ t }: TranslateRunProps) {
  if (t.mode !== 'ondevice') return null
  return (
    <div className="translate-run">
      <button
        type="button"
        className="btn btn--primary"
        onClick={() => void t.runOnDevice()}
        disabled={t.status === 'loading' || !t.sourceText.trim()}
      >
        Translate on-device
      </button>
    </div>
  )
}
