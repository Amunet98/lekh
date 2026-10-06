import type { TranslateState } from '../../hooks/useTranslateState'
import { SHARE_AVAILABLE } from '../../lib/share'
import { fill } from './progressFill'
import { DownloadActions } from '../DownloadActions'
import './translate.css'

const formatMB = (bytes: number) => `${Math.round(bytes / 1e6)} MB`

export function TranslationOutput({ t }: { t: TranslateState }) {
  return (
    <>
      <div className="translate-output dev" aria-live="polite">
        {t.interpretedAs && (
          <p className="sugg-hint interpreted-hint">Interpreted as: {t.interpretedAs}</p>
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
                  style={fill(t.modelLoad.loadedBytes / t.modelLoad.totalBytes)}
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
              {/* Not "Loading model from cache…" when the model is cached. The
                  bytes are already in hand by the time this branch is
                  reached — what is running is the ONNX session coming up, and
                  on a phone that is the longest single wait in the app
                  (~75s measured). Describing it as reading a file the app has
                  already read was the reason a frozen byte count looked like
                  a hang rather than like work. */}
              <span className="model-progress-label">Preparing the model…</span>
            </div>
          )
        ) : t.chunkProgress !== null && t.chunkProgress.total > 1 ? (
          // A long document translates as several sequential requests/passes
          // rather than one — a determinate bar (unlike the indeterminate
          // ones above) since chunk count is known upfront, plus the
          // translation so far so it reads as progress, not a stall.
          <>
            <div className="model-progress">
              <div
                className="model-progress-track"
                role="progressbar"
                aria-label="Translating"
                aria-valuemin={0}
                aria-valuemax={t.chunkProgress.total}
                aria-valuenow={t.chunkProgress.current}
              >
                <div
                  className="model-progress-fill"
                  style={fill(t.chunkProgress.current / t.chunkProgress.total)}
                />
              </div>
              <span className="model-progress-label">
                Translating part {t.chunkProgress.current}/{t.chunkProgress.total}…
              </span>
            </div>
            {t.translated && <p className="chunk-partial">{t.translated}</p>}
          </>
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
      {/* Not rendered until there is something to act on. Disabled, they were a
          grey Copy and Share under an empty pane on every first visit — two
          controls that could not do anything yet. The pane already says where
          the answer will go. */}
      {t.translated && (
        <div className="translate-output__actions reveal">
          {/* Everything you can do with the result, in one row. Export used
              to sit on its own at the foot of the page, below the engine
              line, left-aligned under a right-aligned Copy and Share — three
              places to look for one job. It leads the row because its
              desktop popover opens from its left edge. */}
          <DownloadActions
            text={t.translated}
            filenameBase="lekh-translation"
            label="translation"
            compact
          />
          <span className="translate-output__spacer" />
          {/* The primary action of this screen — see .btn--primary in Editor.css. */}
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void t.copy()}
          >
            {t.copied ? 'Copied' : 'Copy'}
          </button>
          {SHARE_AVAILABLE && (
            <button type="button" className="btn" onClick={() => void t.share()}>
              Share
            </button>
          )}
        </div>
      )}
    </>
  )
}
