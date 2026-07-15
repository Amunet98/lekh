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
        <span className="file-upload__icon" aria-hidden="true">
          🖼️
        </span>
        <span className="file-upload__label">Upload a photo or document</span>
        <span className="file-upload__caption">Image, PDF, DOCX or TXT</span>
      </button>
      <input ref={fileInputRef} type="file" accept={FILE_ACCEPT} hidden onChange={handleFile} />
    </div>
  )
}
