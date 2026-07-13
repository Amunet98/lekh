import { useState } from 'react'
import { useTranslateState } from '../hooks/useTranslateState'
import { ALL_LANGUAGES } from '../lib/translation/languages'
import { hasConfirmedDownload, setConfirmedDownload } from '../lib/translation/onDeviceProvider'
import './Translate.css'

export function Translate() {
  const t = useTranslateState()
  const [showConfirm, setShowConfirm] = useState(false)

  const requestOnDevice = () => {
    if (hasConfirmedDownload()) {
      t.switchToOnDevice()
    } else {
      setShowConfirm(true)
    }
  }

  const confirmDownload = () => {
    setConfirmedDownload()
    setShowConfirm(false)
    t.switchToOnDevice()
  }

  return (
    <section className="translate">
      <span className="tag">Translate</span>
      <h2>English ⇄ Nepali, and more</h2>

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
          onClick={requestOnDevice}
        >
          On-device
        </button>
      </div>

      {showConfirm && (
        <div className="confirm-banner" role="dialog" aria-label="Download on-device model">
          <p>
            The on-device model is about ~600MB and downloads once (cached in your browser
            afterward). Recommended on WiFi — continue?
          </p>
          <div className="confirm-actions">
            <button type="button" className="btn" onClick={confirmDownload}>
              Download &amp; enable
            </button>
            <button type="button" className="btn" onClick={() => setShowConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="lang-row">
        <select
          className="lang-select"
          value={t.sourceLang.code}
          onChange={(e) => {
            const lang = ALL_LANGUAGES.find((l) => l.code === e.target.value)
            if (lang) t.setSourceLang(lang)
          }}
          aria-label="Translate from"
        >
          {ALL_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
        <button type="button" className="swap-btn" onClick={t.swap} title="Swap languages" aria-label="Swap languages">
          ⇄
        </button>
        <select
          className="lang-select"
          value={t.targetLang.code}
          onChange={(e) => {
            const lang = ALL_LANGUAGES.find((l) => l.code === e.target.value)
            if (lang) t.setTargetLang(lang)
          }}
          aria-label="Translate to"
        >
          {ALL_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <div className="translate-panes">
        <textarea
          className="translate-input dev"
          rows={6}
          placeholder="Type text to translate…"
          value={t.sourceText}
          onChange={(e) => t.setSourceText(e.target.value)}
        />
        <div className="translate-output dev" aria-live="polite">
          {t.status === 'loading' && t.mode === 'ondevice' && t.modelProgress !== null ? (
            <span className="sugg-hint">
              Loading model… {Math.round(t.modelProgress * 100)}%
            </span>
          ) : t.status === 'loading' ? (
            <span className="sugg-hint">Translating…</span>
          ) : t.translated ? (
            t.translated
          ) : (
            <span className="sugg-hint">Translation appears here.</span>
          )}
        </div>
      </div>

      {t.mode === 'ondevice' && (
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void t.runOnDevice()}
          disabled={t.status === 'loading' || !t.sourceText.trim()}
        >
          Translate on-device
        </button>
      )}

      {t.error && (
        <div className="error-banner" role="alert">
          <span>{t.error}</span>
          {t.mode === 'online' && (
            <button type="button" className="btn" onClick={requestOnDevice}>
              Switch to on-device
            </button>
          )}
        </div>
      )}

      <p className="privacy">
        {t.mode === 'online'
          ? 'online mode sends text to a free translation API (mymemory.translated.net)'
          : 'on-device mode — nothing you type ever leaves your browser'}
      </p>
    </section>
  )
}
