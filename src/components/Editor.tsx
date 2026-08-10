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
          {/*
            Two buttons rather than one toggle. The single button showed only
            the mode you were *in*, so "EN" was ambiguous — it read equally as
            "you are in English" and "press for English". A segmented control
            shows both states at once and marks which one is live. Clicking the
            active option is a deliberate no-op.
          */}
          <div className="lang-seg" role="group" aria-label="Conversion mode">
            <button
              type="button"
              className="lang-seg__opt"
              aria-pressed={!editor.nepali}
              title="Type plain English — no conversion"
              onClick={() => {
                if (editor.nepali) editor.toggleMode()
                textareaRef.current?.focus()
              }}
            >
              EN
            </button>
            <button
              type="button"
              className="lang-seg__opt dev"
              aria-pressed={editor.nepali}
              title="Convert romanized Nepali to Devanagari"
              onClick={() => {
                if (!editor.nepali) editor.toggleMode()
                textareaRef.current?.focus()
              }}
            >
              नेपाली
            </button>
          </div>
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
        {/*
          Two variants of the middle clause, swapped by pointer type in CSS.
          A phone keyboard has no esc key, so on a touch device that line was
          describing an escape hatch the user physically cannot reach — in the
          installed PWA, which is where most people type Nepali, it was the
          only instruction on screen that could not be followed. The touch
          equivalent already exists: the "(keep)" chip in the suggestion row
          does exactly what esc does.

          Rendered both ways rather than branched in JS: this is presentation,
          and a device that changes pointer type (a tablet gaining a keyboard)
          updates live instead of needing a re-render.
        */}
        <p className="keys-hint">
          <kbd>space</kbd> converts the word ·{' '}
          <span className="keys-hint__fine">
            <kbd>esc</kbd> keeps it in English
          </span>
          <span className="keys-hint__coarse">
            tap <b>(keep)</b> above to keep it in English
          </span>{' '}
          · <kbd>.</kbd> becomes ।
        </p>
      </div>

      <p className="privacy">everything runs in your browser — nothing you type is ever sent anywhere</p>
    </div>
  )
}
