import { useState } from 'react'
import { buildReport, REPORT_EMAIL, reportMailto } from '../lib/report'

import './ReportBlock.css'

/* "Report a problem", for the closed test and after it.
 *
 * The app collects nothing and sends nothing, which is the right trade and
 * also means a report is only ever as good as what the person typing it
 * happens to know — and "which build, which shell, which Android" is a chain
 * of three replies before anyone has said what broke. This composes all of it
 * on the device and puts it one tap from the clipboard.
 *
 * Copy is the primary action rather than the mail link, and not as a fallback.
 * The Android WebView silently drops share, download and print, so a mailto:
 * is a thing to verify on a phone rather than assume; the clipboard is already
 * load-bearing for the editor's own Copy button and is known to work in there.
 * The mail link is offered second, and the address is written out in full
 * underneath so the row still answers "where do I send this" if neither works.
 *
 * <details> rather than a pane of its own: the screen's panes are a linear
 * stack whose shape useAppNavigation maintains as an invariant (home, tab,
 * sheet, About), and a second thing stacked at About's depth is not a pane
 * that stack can describe. This is a disclosure inside About, which needs
 * nothing from history at all.
 */
export function ReportBlock() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  /* Composed when the block is opened, not on every render of About: it stamps
     the time and reads the error buffer, and both should describe the moment
     the user went looking for them. */
  const [report, setReport] = useState('')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Refused. The details are on screen and selectable.
    }
  }

  return (
    <details
      className="report"
      open={open}
      onToggle={(e) => {
        const isOpen = e.currentTarget.open
        setOpen(isOpen)
        if (isOpen) setReport(buildReport())
      }}
    >
      <summary className="sheet-row sheet-row--aside report__summary">
        <span className="sheet-row__icon">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4.5 3 19.5h18Z" />
            <path d="M12 10v4" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <span className="sheet-row__text">
          <b>Report a problem</b>
          <span className="sheet-row__rest">copies your build and device, nothing you typed</span>
        </span>
        <span className="report__chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>

      <div className="report__panel">
        <textarea
          className="report__details"
          readOnly
          rows={9}
          value={report}
          aria-label="Report details"
        />
        <div className="report__actions">
          <button type="button" className="report__button report__button--primary" onClick={copy}>
            {copied ? 'Copied' : 'Copy report'}
          </button>
          <a className="report__button" href={reportMailto(report)}>
            Email it
          </a>
        </div>
        <p className="report__hint">
          Paste it wherever you're reporting, or send it to{' '}
          <span className="report__address">{REPORT_EMAIL}</span> — and say what you were doing
          when it happened.
        </p>
      </div>
    </details>
  )
}
