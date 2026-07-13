import { useState } from 'react'
import { useTranslateState } from '../hooks/useTranslateState'
import { hasConfirmedDownload, setConfirmedDownload } from '../lib/translation/onDeviceProvider'
import { recognizeText } from '../lib/ocr/tesseract'
import { Camera } from './Camera'
import './ScanPage.css'

export function ScanPage() {
  const t = useTranslateState()
  const [showConfirm, setShowConfirm] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'recognizing' | 'error'>('idle')
  const [ocrProgress, setOcrProgress] = useState<number | null>(null)

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

  const handleCapture = async (canvas: HTMLCanvasElement) => {
    setOcrStatus('recognizing')
    setOcrProgress(0)
    try {
      const lang = t.direction === 'ne-en' ? 'nep' : 'eng'
      const text = await recognizeText(canvas, lang, setOcrProgress)
      t.setSourceText(text)
      setOcrStatus('idle')
    } catch {
      setOcrStatus('error')
    } finally {
      setOcrProgress(null)
    }
  }

  return (
    <section className="scan">
      <span className="tag">Scan</span>
      <h2>Scan a document — Nepali ⇄ English</h2>

      <div className="scan-direction">
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

      <Camera onCapture={(canvas) => void handleCapture(canvas)} />

      {ocrStatus === 'recognizing' && (
        <p className="sugg-hint">
          Reading text… {ocrProgress !== null ? Math.round(ocrProgress * 100) : 0}%
        </p>
      )}
      {ocrStatus === 'error' && (
        <div className="error-banner" role="alert">
          Couldn&rsquo;t read text from that photo — try a clearer, well-lit shot.
        </div>
      )}

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

      <div className="translate-panes">
        <textarea
          className="translate-input dev"
          rows={6}
          placeholder="Recognized text appears here — capture a photo, or edit it directly…"
          value={t.sourceText}
          onChange={(e) => t.setSourceText(e.target.value)}
        />
        <div className="translate-output dev" aria-live="polite">
          {t.status === 'loading' && t.mode === 'ondevice' && t.modelProgress !== null ? (
            <span className="sugg-hint">Loading model… {Math.round(t.modelProgress * 100)}%</span>
          ) : t.status === 'loading' ? (
            <span className="sugg-hint">Translating…</span>
          ) : t.translated ? (
            t.translated
          ) : (
            <span className="sugg-hint">Translation appears here.</span>
          )}
        </div>
      </div>

      <div className="scan-actions">
        <button type="button" className="swap-btn" onClick={t.swap} title="Swap direction" aria-label="Swap direction">
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
            <button type="button" className="btn" onClick={requestOnDevice}>
              Switch to on-device
            </button>
          )}
        </div>
      )}

      <p className="privacy">
        {t.mode === 'online'
          ? 'translation uses a free online API (mymemory.translated.net) — the photo itself never leaves your browser, only the recognized text is sent'
          : 'on-device mode — nothing, not even the recognized text, ever leaves your browser'}
      </p>
    </section>
  )
}
