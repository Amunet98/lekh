import { useRef } from 'react'
import { useEditorState } from '../hooks/useEditorState'
import { Editor } from './Editor'
import { CheatSheet } from './CheatSheet'
import './TypePage.css'

export function TypePage() {
  const editor = useEditorState()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <>
      <p className="type-page-intro">
        Type Nepali the way you already text it — <span className="dev">kasto chha</span> becomes{' '}
        <span className="dev">कस्तो छ</span> as you type.
      </p>
      <div className="type-page">
        <div className="type-page__left">
          <Editor editor={editor} textareaRef={textareaRef} />
        </div>
        <div className="type-page__right">
          <CheatSheet
            onInsert={(ch) => {
              editor.insertAtCursor(ch)
              textareaRef.current?.focus()
            }}
          />
        </div>
      </div>
    </>
  )
}
