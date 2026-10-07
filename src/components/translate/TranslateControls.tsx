import { useEffect, useRef, useState } from 'react'
import type { TranslateState } from '../../hooks/useTranslateState'
import { ENGLISH, NEPALI, type Language } from '../../lib/translation/languages'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { DOCK_QUERY } from '../../hooks/useDockDetached'
import { ActionSheet } from '../ActionSheet'
import './translate.css'

const LANGUAGES: Language[] = [NEPALI, ENGLISH]

function CaretIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function SwapIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 7h11M7 7l4-4M7 7l4 4" />
      <path d="M17 17H6M17 17l-4-4M17 17l-4 4" />
    </svg>
  )
}

interface LangPickerProps {
  label: string
  side: 'source' | 'target'
  current: Language
  isOpen: boolean
  /** Below the dock breakpoint the menu is a bottom sheet — see ActionSheet. */
  asSheet: boolean
  onToggle: () => void
  /* Separate from onToggle, and it has to be. ActionSheet closes its <dialog>
     imperatively when `open` goes false, and the element fires onClose in
     response — so a *toggle* wired to that handler sees "closed" and opens it
     straight back up. Closing must be idempotent. */
  onClose: () => void
  onSelect: (lang: Language) => void
}

function LangPicker({ label, side, current, isOpen, asSheet, onToggle, onClose, onSelect }: LangPickerProps) {
  return (
    <div className="lang-picker">
      <button
        type="button"
        className={`mode-btn lang-picker__btn lang-picker__btn--${side}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${label}, ${current.label}`}
        onClick={onToggle}
      >
        {/* The script as a tile, the way Tools heads its cards: grey for what
            you have, the accent for what you are getting — the same colour as
            the answer box it fills. */}
        <span className="lang-picker__script" aria-hidden="true">
          {current.script}
        </span>
        <span className="lang-picker__name">{current.label}</span>
        <CaretIcon />
      </button>
      {isOpen && !asSheet && (
        <div className="lang-picker__menu" role="menu" aria-label={label}>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="menuitemradio"
              aria-checked={lang.code === current.code}
              className={`lang-picker__item${lang.code === current.code ? ' lang-picker__item--active' : ''}`}
              onClick={() => onSelect(lang)}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
      {/* 'radio' rather than 'menu': these are two values of one setting with
          one of them current, which is what menuitemradio says and what the
          accented row shows — the same way .lang-picker__item--active marks
          it in the popover. LANGUAGES is the same module-level array both
          paths read. */}
      {asSheet && (
        <ActionSheet
          open={isOpen}
          onClose={onClose}
          label={label}
          kind="radio"
          options={LANGUAGES.map((lang) => ({
            id: lang.code,
            label: lang.label,
            /* The script, not a flag. A language is not a country — Nepali is
               written in Devanagari whoever is speaking it, and a flag in a
               language picker is the classic way of telling some of your users
               this app is not for them. */
            icon: (
              <span className="action-sheet__script" aria-hidden="true">
                {lang.script}
              </span>
            ),
            selected: lang.code === current.code,
            onSelect: () => onSelect(lang),
          }))}
        />
      )}
    </div>
  )
}

// Google-Translate-style row: [source picker] [swap] [target picker].
// Only two languages are supported (NEPALI, ENGLISH), so picking a language
// in a picker either matches what's already there (no-op, just closes the
// menu) or matches the *other* slot's language — in which case it's really
// a swap request, and t.swap() both flips direction and carries the current
// translation back into the source field.
export function DirectionToggle({ t }: { t: TranslateState }) {
  const [openMenu, setOpenMenu] = useState<'source' | 'target' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  /* Below the dock breakpoint both pickers are bottom sheets — see
     ActionSheet. Same query the section nav uses, imported rather than
     retyped: it is the same judgement about the same device. */
  const asSheet = useMediaQuery(DOCK_QUERY)

  /* Popover only. A <dialog> opened with showModal() closes on Escape and
     makes the rest of the document inert already, so on the sheet path these
     would duplicate what the element gives for free — and the mousedown one
     would be wrong outright, since a press on the sheet's own backdrop is not
     "outside the container" in any sense this ref can see. */
  useEffect(() => {
    if (!openMenu || asSheet) return
    const handlePointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [openMenu, asSheet])

  return (
    <div className="direction-toggle" ref={containerRef}>
      <LangPicker
        label="Source language"
        side="source"
        current={t.sourceLang}
        isOpen={openMenu === 'source'}
        asSheet={asSheet}
        onToggle={() => setOpenMenu((m) => (m === 'source' ? null : 'source'))}
        onClose={() => setOpenMenu(null)}
        onSelect={(lang) => {
          setOpenMenu(null)
          if (lang.code !== t.sourceLang.code) t.swap()
        }}
      />
      <button type="button" className="swap-btn" aria-label="Swap languages" onClick={t.swap}>
        <SwapIcon />
      </button>
      <LangPicker
        label="Target language"
        side="target"
        current={t.targetLang}
        isOpen={openMenu === 'target'}
        asSheet={asSheet}
        onToggle={() => setOpenMenu((m) => (m === 'target' ? null : 'target'))}
        onClose={() => setOpenMenu(null)}
        onSelect={(lang) => {
          setOpenMenu(null)
          if (lang.code !== t.targetLang.code) t.swap()
        }}
      />
    </div>
  )
}

/* The on-device model's download status and the trigger for it.
 *
 * The ~900MB confirmation used to live here too and no longer does — see
 * ModelConfirmSheet at the bottom of this file for why it had to leave.
 *
 * This used to sit in the Translate toolbar with the engine segment above it,
 * where the segment was the second-heaviest thing on the screen and the whole
 * page opened on three stacked rows of chrome before the text field. It is a
 * setting people set once, or never, and it now lives in Settings beside
 * "Downloaded extras", which is the row that measures and clears exactly the
 * thing this downloads. The segment itself is Settings' own <Segmented>, so it
 * matches Theme and Text size rather than being the fourth shape of
 * pick-one-of-N in the app.
 *
 * The page still says which engine is live — see the status line under the
 * output, which offers the switch as well — and the offline banner still
 * offers it inline, because that is the one moment the choice genuinely
 * belongs on the page.
 */
export function EngineStatus({ t }: { t: TranslateState }) {
  return (
    <>
      {t.mode === 'ondevice' && (
        <div className="model-status">
          <p className="sugg-hint">
            {/* "A few seconds", measured, not "about a minute", guessed.
                Timed twice on an A024 from a cold force-stop: 912MB out of
                the cache in ~11s and the finished translation on screen at
                11.5s, with the progress bar counting MB the whole way. The
                old line overstated it by five times and was the last thing
                read before deciding whether to bother with the feature. */}
            {t.modelDownloaded
              ? 'Model downloaded — the first translation after opening the app spends a few seconds loading it into memory.'
              : t.status === 'loading'
                ? 'Downloading the model — you can leave this tab open.'
                : 'Model not downloaded yet — ~900MB one-time download.'}
          </p>
          {/* The reachable trigger.
              Anyone who pressed "Download & enable" before this was fixed has
              the confirmed-flag set in localStorage, so they now skip the
              confirm banner entirely and land here with no model and — until
              this button existed — nothing to press, because "Translate
              on-device" is disabled while the input is empty. */}
          {!t.modelDownloaded && t.status !== 'loading' && (
            <button type="button" className="btn btn--primary" onClick={() => void t.downloadModel()}>
              Download model
            </button>
          )}
        </div>
      )}
    </>
  )
}

/* The ~900MB confirmation, app-level, because the question can be asked from
 * three different places and the answer has to appear at whichever one asked.
 *
 * It used to be an inline block inside EngineStatus, which was fine while the
 * engine controls lived on the Translate page. Moving them into Settings broke
 * it in a way that only showed up on a device: requestOnDevice() is also
 * called by the offline banner and the error banner *on the Translate page*,
 * and those set showConfirm on state whose only renderer was now inside a
 * closed <dialog>. Measured on a first-run profile — cleared flags, forced
 * offline, tapped "Switch to on-device" — the banner mounted at 0x0 inside
 * section.screen__pane, the mode stayed Online, and the tap did nothing
 * visible at all. The button that exists precisely for being offline was a
 * dead end.
 *
 * So it is a sheet owned by App, next to the other things that have to outrank
 * whatever is on screen. showModal() puts it in the top layer, which is what
 * lets one mount serve all three callers — including the Settings segment,
 * where it now opens *above* the settings screen rather than inside it.
 *
 * ActionSheet rather than a fourth dialog shape of its own: this is a question
 * with two answers, which is what that component already is. The prose goes in
 * as children, above the options.
 *
 * (The same "two mounts of one thing, and the wrong one wins" shape as the
 * print sheet, which App.tsx explains at #print-sheet. Worth recognising: a
 * component that renders a response to a global request does not belong inside
 * whichever screen happened to raise it.)
 */
export function ModelConfirmSheet({ t }: { t: TranslateState }) {
  return (
    <ActionSheet
      open={t.showConfirm}
      onClose={t.cancelConfirm}
      label="Download on-device model"
      options={[
        {
          id: 'download',
          label: 'Download & enable',
          /* No hint on this one. The size is already the second sentence of
             the paragraph above, and repeating it inside the pill pushed the
             button to two lines and 70px tall for a fact the reader has just
             been given. */
          primary: true,
          onSelect: t.confirmDownload,
        },
        { id: 'cancel', label: 'Not now', onSelect: t.cancelConfirm },
      ]}
    >
      {/* __text, not __hint. The hint class is the second line *inside* a row
          and carries no padding of its own, so as a top-level child it put
          this paragraph flush against both screen edges — visible in the first
          build of this sheet on the phone. */}
      <p className="action-sheet__text">
        The on-device model is about ~900MB and downloads once (cached on your device
        afterward). Recommended on WiFi.
      </p>
      {t.deviceMemoryTier === 'warn' && (
        <p className="action-sheet__text">
          Your device reports limited memory — on-device translation may run slowly or fail
          partway through. Online mode is more reliable here.
        </p>
      )}
    </ActionSheet>
  )
}
