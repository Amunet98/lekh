import type { TranslateState } from '../../hooks/useTranslateState'
import './translate.css'

interface TranslateActionsProps {
  t: TranslateState
  // Scan's photo never leaves the browser even in online mode (only the
  // OCR'd text is sent) — Translate has no photo, so the copy differs.
  context: 'scan' | 'translate'
}

export function TranslateActions({ t, context }: TranslateActionsProps) {
  return (
    <>
      <div className="translate-actions">
        <button
          type="button"
          className="swap-btn"
          onClick={t.swap}
          title="Swap direction"
          aria-label="Swap direction"
        >
          ⇄
        </button>
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
      </div>

      {t.error && (
        <div className="error-banner" role="alert">
          <span>{t.error}</span>
          {t.mode === 'online' && (
            <button type="button" className="btn" onClick={t.requestOnDevice}>
              Switch to on-device
            </button>
          )}
        </div>
      )}

      <p className="privacy translate-privacy">
        {t.mode === 'online'
          ? context === 'scan'
            ? 'translation uses a free online service (Google Translate, falling back to mymemory.translated.net) — the photo itself never leaves your browser, only the recognized text is sent'
            : 'translation uses a free online service (Google Translate, falling back to mymemory.translated.net) — only the text you enter is sent'
          : context === 'scan'
            ? 'on-device mode — nothing, not even the recognized text, ever leaves your browser'
            : 'on-device mode — nothing you enter ever leaves your browser'}
      </p>
    </>
  )
}
