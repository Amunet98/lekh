import { useEffect, useRef, useState } from 'react'
import type { TranslateState } from '../../hooks/useTranslateState'
import { ENGLISH, NEPALI, type Language } from '../../lib/translation/languages'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { DOCK_QUERY } from '../../hooks/useDockDetached'
import { ActionSheet } from '../ActionSheet'
import { tick } from '../../lib/haptics'
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

function LangPicker({ label, current, isOpen, asSheet, onToggle, onClose, onSelect }: LangPickerProps) {
  return (
    <div className="lang-picker">
      <button
        type="button"
        className="mode-btn lang-picker__btn"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`${label}, ${current.label}`}
        onClick={onToggle}
      >
        {current.label}
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

export function TranslateControls({ t }: { t: TranslateState }) {
  return (
    <>
      {/* A segmented control, like every other pick-one-of-N in the app: the
          editor's EN/नेपाली, and Theme and Text size in Settings. These two
          were loose pills, which said "two independent buttons" about a
          setting that has exactly one live value at a time — and made this the
          only such control in the app not speaking the shared shape.

          aria-pressed rather than a --active class doing double duty: the
          state is then something assistive tech is told rather than something
          only the fill implies, and the fill can key off the attribute (see
          .mode-seg__opt[aria-pressed='true']). Same as .lang-seg. */}
      <div className="translate-mode mode-seg" role="group" aria-label="Translation engine">
        <button
          type="button"
          className="mode-seg__opt"
          aria-pressed={t.mode === 'online'}
          onClick={() => {
            // Pressing the live option is a deliberate no-op, matching
            // .lang-seg and the Settings segmented control.
            if (t.mode === 'online') return
            tick()
            t.switchToOnline()
          }}
        >
          Online
        </button>
        <button
          type="button"
          className="mode-seg__opt"
          aria-pressed={t.mode === 'ondevice'}
          onClick={() => {
            if (t.mode === 'ondevice') return
            tick()
            t.requestOnDevice()
          }}
        >
          On-device
        </button>
      </div>

      {t.mode === 'ondevice' && (
        <div className="model-status">
          <p className="sugg-hint">
            {t.modelDownloaded
              ? 'Model downloaded — loads from device cache.'
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

      {t.showConfirm && (
        <div className="confirm-banner" role="dialog" aria-label="Download on-device model">
          <p>
            The on-device model is about ~900MB and downloads once (cached on your device
            afterward). Recommended on WiFi — continue?
          </p>
          {t.deviceMemoryTier === 'warn' && (
            <p>
              Your device reports limited memory — on-device translation may run slowly or fail
              partway through. Online mode is more reliable here.
            </p>
          )}
          <div className="confirm-actions">
            <button type="button" className="btn" onClick={t.confirmDownload}>
              Download &amp; enable
            </button>
            <button type="button" className="btn" onClick={t.cancelConfirm}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
