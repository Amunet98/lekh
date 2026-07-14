import { useEffect, useRef, useState } from 'react'
import './Camera.css'

interface CameraProps {
  onCapture: (canvas: HTMLCanvasElement) => void
}

type CameraStatus = 'loading' | 'ready' | 'no-camera'
type Mode = 'choose' | 'camera'

export function Camera({ onCapture }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>('choose')
  // Documents are usually scanned with the rear camera, unlike the
  // hand-tracking demos (air-canvas/gesture-recognition) which default front.
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [status, setStatus] = useState<CameraStatus>('loading')

  // Only requests getUserMedia (and the browser's permission prompt) once
  // the user explicitly chooses to scan with the camera — not on mount.
  useEffect(() => {
    if (mode !== 'camera') return
    let cancelled = false

    navigator.mediaDevices
      ?.getUserMedia?.({ video: { facingMode: { ideal: facingMode } } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setStatus('ready')
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            if (!cancelled) {
              setHasMultipleCameras(devices.filter((d) => d.kind === 'videoinput').length > 1)
            }
          })
          .catch(() => {})
      })
      .catch(() => {
        if (!cancelled) setStatus('no-camera')
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [mode, facingMode])

  const capture = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Always draw the raw, unmirrored video frame — the preview may be
    // CSS-mirrored for the front camera, but a mirrored capture would make
    // scanned text unreadable to the OCR engine.
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    onCapture(canvas)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        onCapture(canvas)
      }
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  }

  if (mode === 'choose') {
    return (
      <div className="camera camera--choose">
        <p>Scan a document to get started.</p>
        <div className="camera__actions">
          <button type="button" className="btn btn--primary" onClick={() => setMode('camera')}>
            📷 Scan with camera
          </button>
          <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
            🖼️ Upload image
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
    )
  }

  if (status === 'no-camera') {
    return (
      <div className="camera camera--fallback">
        <p>Camera unavailable or permission denied.</p>
        <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
          Upload a photo instead
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
    )
  }

  return (
    <div className="camera">
      <div className={`camera__video-wrap${facingMode === 'user' ? ' camera__video-wrap--mirrored' : ''}`}>
        <video ref={videoRef} autoPlay playsInline muted className="camera__video" />
        {status === 'loading' && <div className="camera__loading">Starting camera…</div>}
        {hasMultipleCameras && (
          <button
            type="button"
            className="camera__flip"
            onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
            aria-label="Switch camera"
            title="Switch camera"
          >
            🔄
          </button>
        )}
      </div>
      <div className="camera__actions">
        <button type="button" className="btn btn--primary" onClick={capture} disabled={status !== 'ready'}>
          Capture
        </button>
        <button type="button" className="btn" onClick={() => fileInputRef.current?.click()}>
          Upload instead
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      </div>
    </div>
  )
}
