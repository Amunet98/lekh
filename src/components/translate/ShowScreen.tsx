import type { TranslateState } from '../../hooks/useTranslateState'
import { pronounce } from '../../lib/engine/pronounce'
import { ScreenBar } from '../Screen'
import './ShowScreen.css'

/* The translation, as big as the screen allows, to turn round and show
 * someone — a taxi driver, a shopkeeper, a guesthouse owner. Reading a phone
 * held out at arm's length is the whole use, so the text is sized for that and
 * nothing else competes with it.
 *
 * When the translation is Nepali the readable line goes under it, smaller:
 * that half is for the person holding the phone, who may want to try saying
 * it before handing it over. */
export function ShowScreen({ t, onDismiss }: { t: TranslateState; onDismiss: () => void }) {
  const nepali = t.targetLang.code === 'ne'
  const text = t.translated.trim()
  /* Sized by length — a short phrase should fill the screen, a paragraph
     should still fit without scrolling past a screenful if it can. */
  const size = text.length <= 40 ? 'xl' : text.length <= 120 ? 'lg' : 'md'

  return (
    <>
      <ScreenBar id="show-title" title="Show" leading="close" onDismiss={onDismiss} />
      <div className="screen__body show">
        <p className={`show__text show__text--${size}${nepali ? ' dev' : ''}`} lang={t.targetLang.code}>
          {text}
        </p>
        {nepali && text && (
          <p className="show__say" lang="ne-Latn">
            <span className="show__say-label">Say it</span> {pronounce(text)}
          </p>
        )}
      </div>
    </>
  )
}
