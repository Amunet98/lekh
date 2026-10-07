import { pronounce } from '../../lib/engine/pronounce'
import { ScreenBar } from '../Screen'
import './ShowScreen.css'

/* A translation or a phrasebook line, as big as the screen allows, to turn
 * round and show someone — a taxi driver, a shopkeeper, a guesthouse owner.
 * Reading a phone held out at arm's length is the whole use, so the text is
 * sized for that and nothing else competes with it.
 *
 * When the text is Nepali the readable line goes under it, smaller: that half
 * is for the person holding the phone, who may want to try saying it before
 * handing it over. */

/** What to hold up: the text, its language, and — for a phrasebook line with
 *  a hand-written one — the pronunciation to use instead of generating it. */
export interface Shown {
  text: string
  lang: string
  say?: string
}

export function ShowScreen({ shown, onDismiss }: { shown: Shown; onDismiss: () => void }) {
  const nepali = shown.lang === 'ne'
  const text = shown.text.trim()
  /* Sized by length — a short phrase should fill the screen, a paragraph
     should still fit without scrolling past a screenful if it can. */
  const size = text.length <= 40 ? 'xl' : text.length <= 120 ? 'lg' : 'md'

  return (
    <>
      <ScreenBar id="show-title" title="Show" leading="close" onDismiss={onDismiss} />
      <div className="screen__body show">
        <p className={`show__text show__text--${size}${nepali ? ' dev' : ''}`} lang={shown.lang}>
          {text}
        </p>
        {nepali && text && (
          <p className="show__say" lang="ne-Latn">
            <span className="show__say-label">Say it</span> {shown.say ?? pronounce(text)}
          </p>
        )}
      </div>
    </>
  )
}
