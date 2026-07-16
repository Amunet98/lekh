import { useRef } from 'react'
import './FileUpload.css'

export type UploadInput = { kind: 'image'; canvas: HTMLCanvasElement } | { kind: 'file'; file: File }

interface FileUploadProps {
  onInput: (input: UploadInput) => void
}

const FILE_ACCEPT = 'image/*,.pdf,.docx,.txt'

export function FileUpload({ onInput }: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      onInput({ kind: 'file', file })
      return
    }
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        onInput({ kind: 'image', canvas })
      }
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  }

  return (
    <div className="file-upload">
      <button type="button" className="file-upload__card" onClick={() => fileInputRef.current?.click()}>
        <span className="file-upload__icon">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 3h8l4 4v6" />
            <path d="M6 3v18h6" />
            <path d="M14 3v4h4" />
            <text
              x="11"
              y="13.6"
              fontSize="7.5"
              textAnchor="middle"
              fill="currentColor"
              stroke="none"
              style={{ fontFamily: 'var(--devanagari)', fontWeight: 600 }}
            >
              ले
            </text>
            <circle cx="17.5" cy="17.5" r="4.3" />
            <path d="M17.5 19.6v-4" />
            <path d="M15.7 17.3l1.8-1.8 1.8 1.8" />
          </svg>
        </span>
        <span className="file-upload__label">Upload a photo or document</span>
        <span className="file-upload__caption">Image, PDF, DOCX or TXT</span>
      </button>
      <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} hidden onChange={handleFile} />
    </div>
  )
}
