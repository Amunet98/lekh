import { useState } from 'react'
import type { RefObject } from 'react'
import type { EditorState } from '../hooks/useEditorState'
import { SAMPLES } from '../data/samples'
import { hasHintBeenDismissed, markHintDismissed } from '../lib/onboarding'
import './Editor.css'

interface EditorProps {
  editor: EditorState
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function Editor({ editor, textareaRef }: EditorProps) {
  const [hintDismissed, setHintDismissed] = useState(() => hasHintBeenDismissed())

  const handleDismissHint = () => {
    setHintDismissed(true)
    markHintDismissed()
  }

  return (
    <div>
      {!hintDismissed && (
        <div className="hint-banner">
          <p>
            Type Latin letters phonetically — <span className="dev">kasto chha</span> becomes{' '}
            <span className="dev">कस्तो छ</span> as you type.
          </p>
          <button
            type="button"
            className="hint-dismiss"
            aria-label="Dismiss hint"
            onClick={handleDismissHint}
          >
            ✕
          </button>
        </div>
      )}

      <div className={`editor${editor.flashing ? ' editor--flash' : ''}`}>
        <div className="editor-bar">
          <span className="editor-bar__title">
            <span className="dev-serif">नयाँ लेख</span> — untitled.txt
          </span>
        </div>

        <div className="sugg" aria-live="polite">
          {!editor.nepali ? (
            <span className="sugg-hint">Nepali conversion is off — typing plain English.</span>
          ) : !editor.pending ? (
            <span className="sugg-hint">Suggestions appear here as you type…</span>
          ) : (
            <>
              {editor.chips.map((chip) => (
                <button
                  key={chip.text}
                  type="button"
                  className={`chip dev${chip.primary ? ' chip--primary' : ''}`}
                  onClick={() => {
                    editor.chooseChip(chip.text)
                    textareaRef.current?.focus()
                  }}
                >
                  {chip.text}
                  {chip.primary && <kbd>space</kbd>}
                </button>
              ))}
              <button
                type="button"
                className="chip chip--raw"
                onClick={() => {
                  editor.keepRaw()
                  textareaRef.current?.focus()
                }}
              >
                {editor.pending} (keep)
              </button>
            </>
          )}
        </div>

        <textarea
          ref={textareaRef}
          rows={5}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Nepali editor — type romanized Nepali"
          placeholder="namaste — start typing, press space to convert…"
          value={editor.text}
          onChange={(e) => editor.handleChange(e.target.value, e.target.selectionEnd)}
          onKeyDown={editor.handleKeyDown}
        />

        <div className="actions">
          <button
            type="button"
            className="btn btn--toggle"
            aria-pressed={editor.nepali}
            title="Toggle Nepali conversion"
            onClick={() => {
              editor.toggleMode()
              textareaRef.current?.focus()
            }}
          >
            {editor.nepali ? 'नेपाली' : 'EN'}
          </button>
          <button type="button" className="btn" onClick={editor.copy}>
            {editor.copied ? 'copied' : 'copy'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              editor.clear()
              textareaRef.current?.focus()
            }}
          >
            clear
          </button>
          <span className="count">{editor.text.length} chars</span>
        </div>
      </div>

      <div className="samples">
        <span className="tag">Try one</span>
        <div className="samples-row">
          {SAMPLES.map((sample) => (
            <button
              key={sample}
              type="button"
              className="sample"
              onClick={() => {
                editor.appendSample(sample)
                textareaRef.current?.focus()
              }}
            >
              {sample}
            </button>
          ))}
        </div>
        <p className="keys-hint">
          <kbd>space</kbd> converts the word · <kbd>esc</kbd> keeps it in English · <kbd>.</kbd>{' '}
          becomes ।
        </p>
      </div>

      <p className="privacy">everything runs in your browser — nothing you type is ever sent anywhere</p>
    </div>
  )
}
