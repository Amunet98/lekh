import type { TranslateState } from '../../hooks/useTranslateState'
import './translate.css'

export function DirectionToggle({ t }: { t: TranslateState }) {
  return (
    <div className="direction-toggle">
      <button
        type="button"
        className={`mode-btn${t.direction === 'ne-en' ? ' mode-btn--active' : ''}`}
        onClick={() => t.setDirection('ne-en')}
      >
        Nepali → English
      </button>
      <button
        type="button"
        className={`mode-btn${t.direction === 'en-ne' ? ' mode-btn--active' : ''}`}
        onClick={() => t.setDirection('en-ne')}
      >
        English → Nepali
      </button>
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
