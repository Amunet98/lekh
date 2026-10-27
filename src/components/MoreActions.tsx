import { useState, type ReactNode } from 'react'
import { SHARE_AVAILABLE } from '../lib/share'
import { isNativeApp } from '../lib/androidApp'
import { DOWNLOAD_FORMATS, useDownloadActions } from '../hooks/useDownloadActions'
import { ActionSheet, type ActionSheetOption } from './ActionSheet'
import { SheetIcon } from './SheetIcons'

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  )
}

interface MoreActionsProps {
  text: string
  filenameBase: string
  onShare: () => void
  /** Anything the sheet should say above its rows — the Type tab's count. */
  children?: ReactNode
}

/* The phone's ⋯ — every way out for a piece of text, in one sheet.
 *
 * Type had it and Translate did not: the same four actions were a ⋯ sheet on
 * one tab and an Export menu plus a Share button on the next, so someone who
 * had learnt where sharing lived on one screen had to find it again on the
 * other (1.9.75). One component now, so the two cannot drift apart again.
 *
 * Flattened rather than nested: the sheet lists the three formats directly
 * instead of a "Download" row that opens a second sheet on top of the first.
 * That is what useDownloadActions was pulled out of DownloadActions for — the
 * desktop rows still render the pill-with-a-menu, this renders rows, and both
 * dispatch through the same run().
 *
 * An empty text offers nothing rather than dead rows: the button disables
 * itself, the way Copy beside it does. */
export function MoreActions({ text, filenameBase, onShare, children }: MoreActionsProps) {
  const [open, setOpen] = useState(false)
  const { busy, run } = useDownloadActions({ text, filenameBase })
  const native = isNativeApp()

  const options: ActionSheetOption[] = []
  if (text) {
    if (SHARE_AVAILABLE) {
      options.push({
        id: 'share',
        label: 'Share',
        hint: 'Send to another app',
        icon: <SheetIcon name="share" />,
        onSelect: onShare,
      })
    }
    /* "Save as" is the web's verb, and only the web's. Inside the app
       saveFile hands the file to the system share sheet (see download.ts — a
       WebView drops an <a download> silently), so a row promising to save a
       .txt opened a list of chat apps instead. The label says which mechanism
       it is, the way the PDF row already names the print dialog. */
    for (const f of DOWNLOAD_FORMATS) {
      options.push({
        id: f.id,
        label: native ? `Export ${f.noun}` : `Save as ${f.noun}`,
        hint: native && f.id !== 'pdf' ? `${f.hint} · via the share sheet` : f.hint,
        icon: <SheetIcon name={f.icon} />,
        onSelect: () => run(f.id),
      })
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--icon"
        aria-haspopup="dialog"
        aria-label="More actions — share, export"
        title="More actions"
        disabled={options.length === 0 || busy}
        onClick={() => setOpen(true)}
      >
        <MoreIcon />
      </button>
      <ActionSheet open={open} onClose={() => setOpen(false)} label="Text actions" options={options}>
        {children}
      </ActionSheet>
    </>
  )
}
