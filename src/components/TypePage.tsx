import { useCallback, useRef } from 'react'
import { useEditorState } from '../hooks/useEditorState'
import { Editor } from './Editor'
import { CheatSheetPanel } from './CheatSheetPanel'
import './TypePage.css'

interface TypePageProps {
  /* The cheat sheet's open state lives in App, not here, because it is a
     history entry now and not just a boolean — Back has to be able to close
     it. See useAppNavigation. */
  cheatOpen: boolean
  onOpenCheatSheet: () => void
  onCloseCheatSheet: () => void
}

export function TypePage({ cheatOpen, onOpenCheatSheet, onCloseCheatSheet }: TypePageProps) {
  const editor = useEditorState()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* Stable identity, and CheatSheet is memo'd — the two go together and neither
     works alone. Every keystroke updates editor state and re-renders this
     component; with a fresh arrow here, React would reconcile all 76 cheat-sheet
     buttons on every key, for a subtree whose content is a static import. There
     is no React Compiler in this project's Vite config to do it for us.

     The panel being closed most of the time reduces the cost but does not
     remove it: the dialog stays mounted so it can animate and keep focus
     behaviour, so its children still reconcile.

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

  /* Not on touch. This mirrors App.tsx's own caret-focus effect exactly, and
     for the same reason: refocusing the textarea is a convenience on desktop
     (the caret comes back, nothing else happens) but on a phone it also
     summons the on-screen keyboard back over the app the instant the sheet
     has finished visually closing — worse than just leaving focus alone. */
  const closeCheat = useCallback(() => {
    onCloseCheatSheet()
    try {
      if (!matchMedia('(pointer: fine)').matches) return
    } catch {
      return
    }
    textareaRef.current?.focus()
  }, [onCloseCheatSheet])

  return (
    <>
      {/* Marked up, not drawn. The navigation already says you are in Type,
          so a visible page title was repetition — but the screen still needs
          an h1 above the h2s inside it. */}
      <h1 className="sr-only">Type Nepali</h1>

      <div className="type-page">
        <Editor
          editor={editor}
          textareaRef={textareaRef}
          onOpenCheatSheet={onOpenCheatSheet}
        />
      </div>

      {/*
        The cheat sheet used to hold the entire right half of this page,
        permanently, with all seven of its tables expanded — roughly 2000px of
        script reference sitting beside a textarea in a typing app. It is a
        reference you consult, not a thing you read, so it is now behind one
        button in the editor toolbar, with a search field.
      */}
      <CheatSheetPanel open={cheatOpen} onClose={closeCheat} onInsert={handleInsert} />
    </>
  )
}
