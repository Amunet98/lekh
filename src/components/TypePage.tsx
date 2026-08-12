import { useCallback, useRef } from 'react'
import { useEditorState } from '../hooks/useEditorState'
import { Editor } from './Editor'
import { CheatSheet } from './CheatSheet'
import './TypePage.css'

export function TypePage() {
  const editor = useEditorState()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* Stable identity, and CheatSheet is memo'd — the two go together and neither
     works alone. Every keystroke updates editor state and re-renders this
     component; with a fresh arrow here, React would reconcile all 76 cheat-sheet
     buttons on every key, for a subtree whose content is a static import. There
     is no React Compiler in this project's Vite config to do it for us.

     Destructured rather than read as editor.insertAtCursor: the editor object
     is rebuilt on every render, so exhaustive-deps cannot tell that the method
     off it is stable and demands the whole object as a dependency — which would
     invalidate this callback on every keystroke and undo the memo. The function
     itself is a useCallback([]) in useEditorState, so the binding is stable. */
  const { insertAtCursor } = editor
  const handleInsert = useCallback(
    (ch: string) => {
      insertAtCursor(ch)
      textareaRef.current?.focus()
    },
    [insertAtCursor],
  )

  return (
    <>
      {/*
        One quiet line, not the two-line Devanagari headline plus subtitle this
        used to carry. That block was a copy of the old landing page's, and
        between it, the app bar, the tab pill and the hint banner the editor
        started ~430px down — on an iPhone SE you had to scroll before you
        could type, in a typing app. The full statement now lives in the About
        sheet, behind the wordmark, which is where a value proposition belongs.
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
          <CheatSheet onInsert={handleInsert} />
        </details>
      </div>
    </>
  )
}
