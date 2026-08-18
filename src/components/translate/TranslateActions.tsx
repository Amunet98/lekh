import type { TranslateState } from '../../hooks/useTranslateState'
import { runtimeNoun } from '../../lib/runtime'
import './translate.css'

interface TranslateActionsProps {
  t: TranslateState
}

export function TranslateActions({ t }: TranslateActionsProps) {
  return (
    <>
      {t.mode === 'ondevice' && (
        <div className="translate-actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void t.runOnDevice()}
            disabled={t.status === 'loading' || !t.sourceText.trim()}
          >
            Translate on-device
          </button>
        </div>
      )}

      {t.error && (
        <div className="error-banner" role="alert">
          <span>{t.error}</span>
          {t.mode === 'online' && t.deviceMemoryTier !== 'low' && (
            <button type="button" className="btn" onClick={t.requestOnDevice}>
              Switch to on-device
            </button>
          )}
        </div>
      )}

      {/* Behind a disclosure rather than printed in full under every screen.
          It was a two-line monospace paragraph sitting permanently below the
          panes — the single largest block of text on Translate, for something
          most people read once. The summary still states which way the switch
          is set, which is the part that actually needs to be glanceable;
          opening it gives the detail.

          <details> and not state: it works before hydration, is
          keyboard-operable for free, and there is nothing here worth a
          re-render. */}
      <details className="privacy-note">
        <summary>
          <span className={`privacy-note__dot privacy-note__dot--${t.mode}`} aria-hidden="true" />
          {t.mode === 'online' ? 'Online translation' : 'On-device translation'}
        </summary>
        <p>
          {t.mode === 'online'
            ? 'Translation uses a free online service (Google Translate, falling back to mymemory.translated.net). Only the text in this box is sent — if it came from an uploaded photo or document, only the recognized text is sent, never the file itself.'
            : `On-device mode — nothing in this box ever leaves your ${runtimeNoun()}, including anything recognized from an uploaded file.`}
        </p>
      </details>
    </>
  )
}
