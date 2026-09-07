import { useRef, useState } from 'react'
import { saveFile } from '../lib/download'
import { printPage } from '../lib/print'
import { isNativeApp } from '../lib/androidApp'
import { useToast } from './useToast'

export type DownloadFormat = 'txt' | 'docx' | 'pdf'

export const DOWNLOAD_FORMATS: { id: DownloadFormat; label: string; hint: string }[] = [
  { id: 'txt', label: '.txt', hint: 'Plain text' },
  { id: 'docx', label: '.docx', hint: 'Word document' },
  { id: 'pdf', label: 'PDF', hint: 'Via your device’s print dialog' },
]

/* Writing the editor or a translation out to a file.
 *
 * Lifted wholesale out of DownloadActions, which used to be the only way to
 * reach any of it. It has a second caller now: on a phone the Type toolbar
 * puts share, the three formats and clear behind one overflow control, and
 * that overflow needs the formats as *rows in a list* rather than as a button
 * with a menu hanging off it. Two shapes, one set of files it can write, one
 * dispatch — the alternative was a sheet whose only job was to open another
 * sheet.
 *
 * printSheetRef is returned rather than owned here because a hook cannot
 * render: whoever uses this has to put the <div id="print-sheet"> on the page
 * itself. Exactly one caller may do so at a time (the id is in the print
 * stylesheet), which is why the Type toolbar renders either the compact
 * DownloadActions or the overflow, never both.
 */
export function useDownloadActions({
  text,
  filenameBase,
}: {
  text: string
  filenameBase: string
}) {
  const toast = useToast()
  const printSheetRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  const downloadTxt = async () => {
    await saveFile(new Blob([text], { type: 'text/plain' }), `${filenameBase}.txt`)
  }

  const downloadDocx = async () => {
    setBusy(true)
    try {
      // Lazy-imported — this ~500KB lib only loads when a .docx is actually
      // requested. Word (and thus this lib) shapes Devanagari correctly at
      // render time, unlike client-side PDF libs — see printPdf below.
      const { Document, Packer, Paragraph } = await import('docx')
      const doc = new Document({
        sections: [{ children: text.split('\n').map((line) => new Paragraph(line)) }],
      })
      await saveFile(await Packer.toBlob(doc), `${filenameBase}.docx`)
    } finally {
      setBusy(false)
    }
  }

  const printPdf = () => {
    // jsPDF/pdf-lib can't shape Devanagari text — the browser's own print
    // engine is the only correct client-side path, so "Save as PDF" hands
    // off to window.print() with a print-only sheet (see @media print CSS).
    if (printSheetRef.current) printSheetRef.current.textContent = text
    // Not window.print() directly — the Android WebView has none. See print.ts.
    printPage(filenameBase)
  }

  /* Dispatch by id rather than storing the handlers in the list.
     DOWNLOAD_FORMATS is module-level, inert data; building it with `run:`
     closures meant an array constructed *during render* held a function that
     reads printSheetRef, which react-hooks/refs correctly rejects.

     Success is only worth announcing on the web, where a download can finish
     entirely out of sight — in a standalone PWA window there is no download
     bar to notice. In the app the system share sheet has already appeared
     over the page, and a toast confirming what the user can see is noise.
     Failure is announced in both, because in both it is otherwise silent. */
  const run = (id: DownloadFormat) => {
    if (id === 'pdf') {
      printPdf()
      return
    }
    const filename = `${filenameBase}.${id}`
    void (id === 'txt' ? downloadTxt() : downloadDocx())
      .then(() => {
        if (!isNativeApp()) toast.done(`Saved ${filename}`)
      })
      .catch((err: unknown) =>
        /* An outdated-app message says something the generic one cannot, and
           is the only case where the failure is actionable. */
        toast.problem(
          err instanceof Error && err.message.includes('update it')
            ? err.message
            : `Could not save ${filename}`,
        ),
      )
  }

  return { busy, run, printSheetRef }
}
