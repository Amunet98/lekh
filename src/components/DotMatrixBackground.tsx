import { useEffect, useRef } from 'react'
import './DotMatrixBackground.css'

function parseAccentRgb(): { r: number; g: number; b: number } {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
  const hex = raw.startsWith('#') ? raw.slice(1) : raw
  if (hex.length === 6 && /^[0-9a-f]+$/i.test(hex)) {
    const n = parseInt(hex, 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  return { r: 220, g: 38, b: 38 } // matches --accent light-mode value
}

export function DotMatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (time: number) => {
      const w = window.innerWidth
      const h = window.innerHeight
      const t = reducedMotion ? 0 : time * 0.001
      const { r, g, b } = parseAccentRgb()

      ctx.clearRect(0, 0, w, h)

      const spacing = Math.max(12, Math.min(22, Math.floor((w + h) * 0.017)))

      for (let y = spacing * 0.5; y < h; y += spacing) {
        for (let x = spacing * 0.5; x < w; x += spacing) {
          const wave =
            Math.sin(t * 0.88 + x * 0.015 + y * 0.012) * 0.5 +
            Math.cos(t * 0.62 - x * 0.009 + y * 0.018) * 0.28 +
            0.5
          const alpha = 0.065 + wave * 0.22
          const radius = 0.8 + wave * 1.2
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (!reducedMotion) rafId = requestAnimationFrame(draw)
    }

    const onResize = () => {
      resize()
      if (reducedMotion) draw(0)
    }

    onResize()

    if (!reducedMotion) {
      rafId = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return <canvas ref={canvasRef} className="dot-matrix-bg" aria-hidden />
}
