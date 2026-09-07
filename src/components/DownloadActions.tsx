import { useEffect, useRef, useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { DOCK_QUERY } from '../hooks/useDockDetached'
import { DOWNLOAD_FORMATS, useDownloadActions } from '../hooks/useDownloadActions'
import { ActionSheet } from './ActionSheet'
import './DownloadActions.css'

/* Shared by Translate and Type.
 *
 * It was Translate's alone, and the asymmetry showed: one screen could give
 * you a .docx of its output and the other could only put its text on the
 * clipboard. Typing is the app's main job — it is the thing named on the
 * front of the box — and it was the screen you could not get a file out of.
 *
 * The formats and the writing live in useDownloadActions now, because the
 * Type toolbar's phone overflow needs the same list without this button
 * around it. This file is the button.
 */

interface DownloadActionsProps {
  /** What to write out. */
  text: string
  /** Filename without an extension, e.g. 'lekh-translation'. */
  filenameBase: string
  /** Names the menu for assistive tech: "Download <this> as". */
  label: string
  /** The smaller pill, for the editor's actions row. */
  compact?: boolean
}

export function DownloadActions({ text, filenameBase, label, compact = false }: DownloadActionsProps) {
  const { busy, run, printSheetRef } = useDownloadActions({ text, filenameBase })
  const enabled = text.trim().length > 0

  // A menu, not a <select>. The native control was the one thing on the page
  // the browser drew for us — it ignored the pill language every other control
  // speaks, and it was being abused as a menu anyway (a "Download ▾" option
  // that is not a value, reset to '' on every change so re-picking the same
  // format fires again). Same disclosure pattern as LangPicker in
  // TranslateControls: outside-click and Escape both close it.
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  /* Below the dock breakpoint this list is a bottom sheet instead — see
     ActionSheet. The same query the section nav uses, imported rather than
     retyped, because it is the same judgement: this is a phone. */
  const asSheet = useMediaQuery(DOCK_QUERY)

  /* Popover only. A <dialog> opened with showModal() already closes on
     Escape and already makes the rest of the document inert, so on the sheet
     path these two listeners would be a second, redundant implementation of
     behaviour the element gives for free — and the mousedown one would be
     actively wrong, since a press on the sheet's own backdrop is not "outside
     the wrapper" in any sense this ref can see. */
  useEffect(() => {
    if (!open || asSheet) return
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, asSheet])

  return (
    <div className="download-actions" ref={wrapRef}>
      <div className="download-menu">
        <button
          type="button"
          className={`download-menu__btn${compact ? ' download-menu__btn--compact' : ''}`}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={!enabled || busy}
          onClick={() => setOpen((v) => !v)}
        >
          {busy ? 'Preparing…' : 'Download'}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {/* One list, two shapes. FORMATS is module-level data and run() is a
            plain dispatch on an id, so neither path owns the options — adding
            a format still means editing one array. */}
        {open && !asSheet && (
          <div className="download-menu__menu" role="menu" aria-label={`Download ${label} as`}>
            {DOWNLOAD_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="menuitem"
                className="download-menu__item"
                onClick={() => {
                  setOpen(false)
                  run(f.id)
                }}
              >
                <span className="download-menu__label">{f.label}</span>
                <span className="download-menu__hint">{f.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {asSheet && (
        <ActionSheet
          open={open}
          onClose={() => setOpen(false)}
          label={`Download ${label} as`}
          options={DOWNLOAD_FORMATS.map((f) => ({
            id: f.id,
            label: f.label,
            hint: f.hint,
            onSelect: () => run(f.id),
          }))}
        />
      )}
      <div id="print-sheet" ref={printSheetRef} className="print-sheet" />
    </div>
  )
}
