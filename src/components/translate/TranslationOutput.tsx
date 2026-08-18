import type { TranslateState } from '../../hooks/useTranslateState'
import './translate.css'

const formatMB = (bytes: number) => `${Math.round(bytes / 1e6)} MB`

export function TranslationOutput({ t }: { t: TranslateState }) {
  return (
    <>
      <div className="translate-output dev" aria-live="polite">
        {t.interpretedAs && (
          <p className="sugg-hint interpreted-hint">interpreted as: {t.interpretedAs}</p>
        )}
        {t.status === 'loading' && t.modelLoad !== null ? (
          t.modelLoad.phase === 'downloading' ? (
            <div className="model-progress">
              <div
                className="model-progress-track"
                role="progressbar"
                aria-label="Model download"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.floor(
                  (t.modelLoad.loadedBytes / t.modelLoad.totalBytes) * 100,
                )}
              >
                <div
                  className="model-progress-fill"
                  style={{
                    width: `${(t.modelLoad.loadedBytes / t.modelLoad.totalBytes) * 100}%`,
                  }}
                />
              </div>
              <span className="model-progress-label">
                {t.modelDownloaded ? 'Loading model from cache…' : 'Downloading model…'}{' '}
                {formatMB(t.modelLoad.loadedBytes)} / {formatMB(t.modelLoad.totalBytes)}
              </span>
            </div>
          ) : (
            <div className="model-progress">
              <div className="model-progress-track" role="progressbar" aria-label="Model load">
                <div className="model-progress-fill model-progress-fill--indeterminate" />
              </div>
              <span className="model-progress-label">
                {t.modelDownloaded ? 'Loading model from cache…' : 'Preparing model…'}
              </span>
            </div>
          )
        ) : t.status === 'loading' && t.mode === 'ondevice' ? (
          // Same indeterminate-bar treatment as model loading above, not just
          // static text — inference on a phone's CPU can take a genuinely long
          // moment on a full document, and a bar reads as "still working"
          // where a line of text that never changes starts to read as stuck.
          <div className="model-progress">
            <div className="model-progress-track" role="progressbar" aria-label="Translating">
              <div className="model-progress-fill model-progress-fill--indeterminate" />
            </div>
            <span className="model-progress-label">Translating…</span>
          </div>
        ) : t.status === 'loading' ? (
          <span className="sugg-hint">Translating…</span>
        ) : t.translated ? (
          t.translated
        ) : (
          <span className="sugg-hint">Translation appears here.</span>
        )}
      </div>
      <div className="translate-output__actions">
        <button type="button" className="btn" disabled={!t.translated} onClick={() => void t.copy()}>
          {t.copied ? 'copied' : 'copy'}
        </button>
      </div>
    </>
  )
}
