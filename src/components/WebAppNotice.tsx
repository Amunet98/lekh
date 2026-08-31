import { useState } from 'react'
import { APK_URL, isAndroidWebApp } from '../lib/androidApp'
import './WebAppNotice.css'

const DISMISSED_KEY = 'lekh-web-app-notice-dismissed'

/* localStorage, not sessionStorage: this is a fact about the reader's install,
 * not about this visit. Once they have been told, telling them again on every
 * launch would be nagging about a decision they are entitled to keep. */
function alreadyDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    // Storage blocked. Show it — being told twice beats never being told.
    return false
  }
}

interface WebAppNoticeProps {
  /** Hidden while the boot screen or About sheet is up, same as UpdatePrompt. */
  suppressed?: boolean
}

/* Says out loud that this is the web app, not the Android app.
 *
 * Chrome's ⋮ "Install and create shortcut" installs the web version, and no
 * manifest field can remove that entry — it is universal-install, and it shows
 * up even on pages with no manifest (verified against example.com on a real
 * Chrome 151). So the site cannot stop someone landing here; what it can do is
 * stop it being silent.
 *
 * Silent is the actual problem. The web app is a faithful copy of everything
 * on screen — the difference is the Patro home-screen widget, which lives in
 * the APK and cannot exist in a PWA. Someone who installed from the menu has
 * no way to know they gave that up, and would find out by hunting for a widget
 * that is not in the picker and concluding it is broken.
 *
 * Not a modal, and dismissible for good. Their install works; this is worth
 * one mention, not an obstacle.
 */
export function WebAppNotice({ suppressed = false }: WebAppNoticeProps) {
  /* Both reads happen once, in lazy initialisers, rather than in the render
     body — matchMedia and localStorage are external state, and this repo's
     react-hooks/purity rule is right to want them out of the render path.
     Neither answer can change without a reload anyway: nothing turns a
     standalone window back into a tab in place. */
  const [isWebApp] = useState(isAndroidWebApp)
  const [dismissed, setDismissed] = useState(alreadyDismissed)

  if (!isWebApp || dismissed || suppressed) return null

  return (
    <div className="web-app-notice" role="status" aria-live="polite">
      <p className="web-app-notice__text">
        You have the web version of <span className="web-app-notice__mark">लेख</span>
        <span className="web-app-notice__slash">/</span>
        <span className="web-app-notice__patro">पात्रो</span>.
      </p>
      {/* The one concrete consequence, named. Everything else about the two
          builds is identical, and claiming more would be untrue. */}
      <p className="web-app-notice__note">
        Typing, Translate and Patro all work the same here. The one thing it
        cannot have is the Patro home-screen widget — that needs the Android
        app.
      </p>
      <div className="web-app-notice__actions">
        <button
          type="button"
          className="web-app-notice__btn web-app-notice__btn--ghost"
          onClick={() => {
            setDismissed(true)
            try {
              localStorage.setItem(DISMISSED_KEY, '1')
            } catch {
              // Storage blocked — it stays gone for this session regardless.
            }
          }}
        >
          Keep this
        </button>
        <a
          className="web-app-notice__btn web-app-notice__btn--primary"
          href={APK_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get app (.apk)
        </a>
      </div>
    </div>
  )
}
