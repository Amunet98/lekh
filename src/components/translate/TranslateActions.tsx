import { useState } from 'react'
import type { TranslateState } from '../../hooks/useTranslateState'
import { ActionSheet } from '../ActionSheet'
import { SheetIcon } from '../SheetIcons'
import './translate.css'

interface TranslateActionsProps {
  t: TranslateState
}

function ChevronIcon() {
  return (
    <svg
      className="engine-pick__chevron"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  )
}

const ONLINE_DETAIL =
  'Translation uses a free online service (Google Translate, falling back to mymemory.translated.net). Only the text in this box is sent — if it came from an uploaded photo or document, only the recognized text is sent, never the file itself.'
const ONDEVICE_DETAIL =
  'On-device mode — nothing in this box ever leaves your device, including anything recognized from an uploaded file.'

/* Which engine is running, and the way to change it.
 *
 * This was a <details>: the summary said "Online translation" and opening it
 * explained where your text goes. Two problems, and the second is the one that
 * mattered.
 *
 * The first was that on-device was not mentioned at all, so the page never
 * admitted the alternative existed. That was fixed by putting the offer inside
 * the opened disclosure — and it was not enough, because of the second
 * problem: nothing about the line said it could be opened. `.disclosure >
 * summary` in App.css states its own intent plainly — "a line of small print
 * that happens to open, not a control anyone is hunting for" — and it carries
 * no caret here. A new user reads a dot and a label and correctly concludes it
 * is a status line. An affordance that only works for people who already
 * suspect it is there is not an affordance.
 *
 * So it is a control now, shaped like the two language pickers sitting
 * directly above it on this same screen: a row that names the current value
 * and opens a sheet of the alternatives. That is a pattern the user has
 * already met a few centimetres away, rather than a new one to learn — and
 * "Change" plus a chevron says what a bare caret would not.
 *
 * The explanation is not lost, it moved: it is the sheet's prose, above the
 * choice it is there to inform. Which is better placed than it was — you now
 * read where your words go at the moment you are deciding where to send them,
 * rather than having to go looking for it first.
 */
export function TranslateActions({ t }: TranslateActionsProps) {
  const [open, setOpen] = useState(false)
  const online = t.mode === 'online'
  /* Below the trustworthy memory range on-device cannot run at all —
     requestOnDevice refuses it with an error rather than trying. So it is not
     offered as a choice; the sheet says why instead, which is more use than a
     row that only ever produces an error message. */
  const canRunOnDevice = t.deviceMemoryTier !== 'low'

  return (
    <>
      <button
        type="button"
        className="engine-pick"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span
          className={`privacy-note__dot privacy-note__dot--${t.mode}`}
          aria-hidden="true"
        />
        <span className="engine-pick__label">
          {online ? 'Online translation' : 'On-device translation'}
        </span>
        <span className="engine-pick__change">Change</span>
        <ChevronIcon />
      </button>

      <ActionSheet
        open={open}
        onClose={() => setOpen(false)}
        label="Translation engine"
        kind="radio"
        options={[
          {
            id: 'online',
            label: 'Online',
            hint: 'Faster, no download — your text is sent to a service',
            icon: <SheetIcon name="cloud" />,
            selected: online,
            onSelect: t.switchToOnline,
          },
          ...(canRunOnDevice
            ? [
                {
                  id: 'ondevice',
                  label: 'On-device',
                  hint: 'Private and works offline — one-time ~900MB download',
                  icon: <SheetIcon name="device" />,
                  selected: !online,
                  /* May raise the confirmation sheet. ActionSheet closes
                     itself before running this, so the two never stack. */
                  onSelect: t.requestOnDevice,
                },
              ]
            : []),
        ]}
      >
        <p className="action-sheet__text">{online ? ONLINE_DETAIL : ONDEVICE_DETAIL}</p>
        {!canRunOnDevice && (
          <p className="action-sheet__text">
            On-device translation needs more memory than this device reports, so only online
            translation is available here.
          </p>
        )}
      </ActionSheet>
    </>
  )
}
