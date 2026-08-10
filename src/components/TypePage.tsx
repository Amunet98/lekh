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
      {/*
        One quiet line, not the two-line Devanagari headline plus subtitle this
        used to carry. That block was a copy of the landing page's, and between
        it, the app bar, the tab pill and the hint banner the editor started
        ~430px down — on an iPhone SE you had to scroll before you could type,
        in a typing app. The full statement still opens the landing page, which
        is where a value proposition belongs.
      */}
      <div className="hero">
        <h1 className="hero__line">
          Think in English, <span className="hero__accent">write in Nepali</span>.
        </h1>
      </div>
      <div className="type-page">
        <div className="type-page__left">
          <Editor editor={editor} textareaRef={textareaRef} />
        </div>
        {/*
          <details> rather than state: on desktop CSS forces it open and hides
          the summary, so the reference is simply there; on a phone it collapses
          to a single row, because a ~2000px script table sitting under the
          editor is not something you want to scroll past to reach the sample
          chips. Native disclosure also means it works before hydration and is
          keyboard-operable for free.
        */}
        <details className="type-page__right" open>
          <summary className="cheat-toggle">
            <span>Cheat sheet — how letters map</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </summary>
          <CheatSheet
            onInsert={(ch) => {
              editor.insertAtCursor(ch)
              textareaRef.current?.focus()
            }}
          />
        </details>
      </div>
    </>
  )
}
