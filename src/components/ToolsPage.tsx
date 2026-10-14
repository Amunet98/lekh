import { useRef, type KeyboardEvent } from 'react'
import { usePref } from '../hooks/usePref'
import { tick } from '../lib/haptics'
import { TOOL_IDS, type ToolId } from '../lib/prefs'
import { DateConverter } from './calendar/DateConverter'
import type { Shown } from './translate/ShowScreen'
import { CurrencyTool } from './tools/CurrencyTool'
import { NumberTool } from './tools/NumberTool'
import { Phrasebook } from './tools/Phrasebook'
import { PreetiTool } from './tools/PreetiTool'
import { ToolIcon } from './tools/ToolIcons'
import './ToolsPage.css'

/* Small jobs that kept sending people to other websites: converting a date
 * between BS and AD, writing an amount out in words, converting money at
 * Nepal Rastra Bank's rates, moving text between Preeti and Unicode, and a
 * phrasebook for visitors.
 *
 * ONE TOOL AT A TIME
 *
 * They used to be stacked, card under card, which made the tab a long scroll
 * to reach the phrasebook at the bottom — and every tool you did not want sat
 * between you and the one you did. Now a switcher at the top names all five
 * and shows one. It is drawn like the dock (an --accent-bg tile on the
 * current one), because it is the same kind of control one level down.
 *
 * Every tool stays mounted and the others are hidden, not unmounted, so an
 * amount typed in one is still there after a look at another — the same
 * keep-alive the sections themselves get in App.tsx. The last tool used is
 * remembered. */

const LABELS: Record<ToolId, string> = {
  date: 'Date',
  amount: 'Amount',
  currency: 'Currency',
  preeti: 'Preeti',
  phrases: 'Phrases',
}

export function ToolsPage({ onShow }: { onShow: (shown: Shown) => void }) {
  const [tool, setTool] = usePref('tool')
  const tabs = useRef<Record<string, HTMLButtonElement | null>>({})

  const select = (next: ToolId, focus = false) => {
    if (next === tool) return
    tick()
    setTool(next)
    if (focus) tabs.current[next]?.focus()
  }

  /* Arrow keys move along the row, as in any tablist; Home and End jump to
     the ends. Only the current tab is in the Tab order (roving tabindex). */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TOOL_IDS.indexOf(tool)
    const n = TOOL_IDS.length
    const to =
      e.key === 'ArrowRight' ? (i + 1) % n
      : e.key === 'ArrowLeft' ? (i - 1 + n) % n
      : e.key === 'Home' ? 0
      : e.key === 'End' ? n - 1
      : -1
    if (to < 0) return
    e.preventDefault()
    select(TOOL_IDS[to], true)
  }

  return (
    <div className="tools">
      <h1 className="sr-only">Tools</h1>
      <div className="tools-nav" role="tablist" aria-label="Tools" onKeyDown={onKeyDown}>
        {TOOL_IDS.map((t) => (
          <button
            key={t}
            ref={(el) => {
              tabs.current[t] = el
            }}
            type="button"
            role="tab"
            id={`tool-tab-${t}`}
            aria-selected={t === tool}
            aria-controls={`tool-panel-${t}`}
            tabIndex={t === tool ? 0 : -1}
            className="tools-nav__tab"
            onClick={() => select(t)}
          >
            <ToolIcon name={t} />
            <span className="tools-nav__label">{LABELS[t]}</span>
          </button>
        ))}
      </div>

      {TOOL_IDS.map((t) => (
        <div
          key={t}
          role="tabpanel"
          id={`tool-panel-${t}`}
          aria-labelledby={`tool-tab-${t}`}
          className="tools__panel"
          hidden={t !== tool}
        >
          {t === 'date' && <DateConverter />}
          {t === 'amount' && <NumberTool />}
          {t === 'currency' && <CurrencyTool active={tool === 'currency'} />}
          {t === 'preeti' && <PreetiTool />}
          {t === 'phrases' && <Phrasebook onShow={onShow} />}
        </div>
      ))}
    </div>
  )
}
