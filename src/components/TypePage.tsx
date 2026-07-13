import { useRef } from 'react'
import { useEditorState } from '../hooks/useEditorState'
import { Editor } from './Editor'
import { CheatSheet } from './CheatSheet'
import { Roadmap } from './Roadmap'
import './TypePage.css'

export function TypePage() {
  const editor = useEditorState()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
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
        <Roadmap />
      </div>
    </div>
  )
}
