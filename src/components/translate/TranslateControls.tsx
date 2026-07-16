import { useEffect, useRef, useState } from 'react'
import type { TranslateState } from '../../hooks/useTranslateState'
import { ENGLISH, NEPALI, type Language } from '../../lib/translation/languages'
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
  onToggle: () => void
  onSelect: (lang: Language) => void
}

function LangPicker({ label, current, isOpen, onToggle, onSelect }: LangPickerProps) {
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
      {isOpen && (
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

  useEffect(() => {
    if (!openMenu) return
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
  }, [openMenu])

  return (
    <div className="direction-toggle" ref={containerRef}>
      <LangPicker
        label="Source language"
        current={t.sourceLang}
        isOpen={openMenu === 'source'}
        onToggle={() => setOpenMenu((m) => (m === 'source' ? null : 'source'))}
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
        onToggle={() => setOpenMenu((m) => (m === 'target' ? null : 'target'))}
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
      <div className="translate-mode">
        <button
          type="button"
          className={`mode-btn${t.mode === 'online' ? ' mode-btn--active' : ''}`}
          onClick={t.switchToOnline}
        >
          Online
        </button>
        <button
          type="button"
          className={`mode-btn${t.mode === 'ondevice' ? ' mode-btn--active' : ''}`}
          onClick={t.requestOnDevice}
        >
          On-device
        </button>
      </div>

      {t.mode === 'ondevice' && (
        <p className="sugg-hint model-status">
          {t.modelDownloaded
            ? 'Model downloaded — loads from browser cache.'
            : 'Model not downloaded yet — ~900MB one-time download.'}
        </p>
      )}

      {t.showConfirm && (
        <div className="confirm-banner" role="dialog" aria-label="Download on-device model">
          <p>
            The on-device model is about ~900MB and downloads once (cached in your browser
            afterward). Recommended on WiFi — continue?
          </p>
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
