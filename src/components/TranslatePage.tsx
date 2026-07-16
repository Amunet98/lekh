import { useEffect } from 'react'
import { useTranslateState } from '../hooks/useTranslateState'
import { DirectionToggle, TranslateControls } from './translate/TranslateControls'
import { TranslationOutput } from './translate/TranslationOutput'
import { TranslateActions } from './translate/TranslateActions'
import { DownloadActions } from './translate/DownloadActions'
import './TranslatePage.css'

interface TranslatePageProps {
  handoffText: string | null
  onHandoffConsumed: () => void
}

export function TranslatePage({ handoffText, onHandoffConsumed }: TranslatePageProps) {
  const t = useTranslateState()

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
      <span className="tag">Translate</span>
      <h2>Translate — English ⇄ Nepali</h2>

      <DirectionToggle t={t} />
      <TranslateControls t={t} />

      <div className="translate-panes">
        <textarea
          className="translate-input dev"
          rows={6}
          placeholder="Type English or Nepali (or romanized Nepali like 'mero naam')…"
          value={t.sourceText}
          onChange={(e) => t.setSourceText(e.target.value)}
        />
        <TranslationOutput t={t} />
      </div>

      <TranslateActions t={t} context="translate" />
      <DownloadActions t={t} />
    </section>
  )
}
