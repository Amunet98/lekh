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
      <div className="hero">
        <h1 className="hero__line dev-serif">
          सोच्नुहोस् अंग्रेजीमा, <span className="hero__accent">लेख्नुहोस् नेपालीमा।</span>
        </h1>
        <p className="hero__sub">Think in English, write in Nepali — right in your browser.</p>
      </div>
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
