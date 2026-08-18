import { useEffect } from 'react'
import type { TranslateState } from '../hooks/useTranslateState'
import { DirectionToggle, TranslateControls } from './translate/TranslateControls'
import { TranslationOutput } from './translate/TranslationOutput'
import { TranslateActions } from './translate/TranslateActions'
import { DownloadActions } from './translate/DownloadActions'
import './TranslatePage.css'

interface TranslatePageProps {
  t: TranslateState
  handoffText: string | null
  onHandoffConsumed: () => void
}

export function TranslatePage({ t, handoffText, onHandoffConsumed }: TranslatePageProps) {
  useEffect(() => {
    if (handoffText === null) return
    t.setSourceText(handoffText)
    onHandoffConsumed()
    // Only ever fires when a new handoff arrives — t/onHandoffConsumed are
    // stable enough within a tab's lifetime, and re-running on every
    // sourceText edit would fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handoffText])

  return (
    <section className="translate-page">
      {/* Marked up, not drawn. The navigation already says you are in
          Translate, so an eyebrow tag reading "TRANSLATE" above a heading
          reading "Translate text" was the same word three times on one
          screen — but removing the heading outright left the page with no h1
          above the headings inside it. */}
      <h1 className="sr-only">Translate text</h1>

      {/* One toolbar. These were three stacked rows — language pickers, then
          engine, then the panes — which pushed the actual text fields a third
          of the way down the page for two controls most people set once. */}
      <div className="translate-toolbar">
        <DirectionToggle t={t} />
        <TranslateControls t={t} />
      </div>

      <div className="translate-panes">
        <div className="translate-pane">
          <label className="translate-pane__label" htmlFor="translate-source">
            {t.sourceLang.label}
          </label>
          <textarea
            id="translate-source"
            className="translate-input dev"
            rows={6}
            placeholder="Type English or Nepali (or romanized Nepali like 'mero naam')…"
            value={t.sourceText}
            onChange={(e) => t.setSourceText(e.target.value)}
          />
        </div>
        <div className="translate-pane">
          <span className="translate-pane__label">{t.targetLang.label}</span>
          <TranslationOutput t={t} />
        </div>
      </div>

      <TranslateActions t={t} context="translate" />
      <DownloadActions t={t} />
    </section>
  )
}
