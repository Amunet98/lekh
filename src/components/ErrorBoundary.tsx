import { Component, type ErrorInfo, type ReactNode } from 'react'
import { recordError } from '../lib/lastError'
import { buildReport } from '../lib/report'

import './ErrorBoundary.css'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
  copied: boolean
  /* Composed once, in componentDidCatch, and not during render.
   *
     Order is the whole reason this is state rather than a call in render:
     getDerivedStateFromError runs first, in the render phase, so a report
     composed there is composed *before* componentDidCatch has recorded the
     very crash that put this screen on the screen — it came out saying "none
     recorded", which is the one thing it must never say here. Composing it in
     the commit phase instead also stops the timestamp being restamped on
     every re-render the Copied label causes. */
  report: string
}

/* The floor under a crash.
 *
 * There was nothing here before, and on this app that is worse than it sounds:
 * capacitor.config.ts points the WebView at the live site, so a render that
 * throws does not white-screen one browser tab — it white-screens the installed
 * app on every phone at once, with no way to roll back faster than a deploy.
 * A blank screen also tells the person holding the phone nothing, so the report
 * that comes back is "it stopped working", which is the report that cannot be
 * acted on.
 *
 * A class, because getDerivedStateFromError has no hook equivalent; this is the
 * one component in the app that has to be one.
 *
 * The fallback is held to a hard rule: it must not be able to throw. No
 * Capacitor calls, no prefs, no toasts, no fonts it needs loaded — the reason
 * it is on screen is that something in that tree already failed. It is plain
 * markup over the tokens index.html's bootstrap put on :root before first
 * paint, which is why it is themed correctly even here.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, copied: false, report: '' }

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    /* Into the same buffer the window listeners write to, so one Copy hands
       over the crash and whatever led up to it in one block. The component
       stack is the half a minified message alone does not give you. */
    recordError(error, info.componentStack?.split('\n').find((l) => l.trim())?.trim())
    // After recordError, so the report carries the crash and not just its
    // history. Still inside the commit, so nothing is painted without it.
    this.setState({ report: buildReport() })
  }

  private copy = () => {
    void navigator.clipboard
      ?.writeText(this.report())
      .then(() => {
        this.setState({ copied: true })
        setTimeout(() => this.setState({ copied: false }), 1600)
      })
      /* Clipboard refused. Saying nothing would read as the button being
         dead, and the details are on screen to select by hand anyway. */
      .catch(() => {})
  }

  /* The fallback if componentDidCatch never ran — it always should, but this
     screen is the one place in the app that cannot assume anything did. */
  private report(): string {
    return this.state.report || buildReport()
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="crash" role="alert">
        <div className="crash__card">
          <h1 className="crash__title">Lekh Patro stopped</h1>
          <p className="crash__body">
            Something in the app broke. Nothing you typed has been sent anywhere — but the
            details below say which build and which phone this happened on, which is what
            makes it fixable.
          </p>
          {/* Readonly and selectable rather than hidden behind the button
              alone: the clipboard is the one thing here that can still be
              refused, and this is the fallback that needs no permission. */}
          <textarea className="crash__details" readOnly rows={10} value={this.report()} />
          <div className="crash__actions">
            <button type="button" className="crash__button crash__button--primary" onClick={this.copy}>
              {this.state.copied ? 'Copied' : 'Copy details'}
            </button>
            <button
              type="button"
              className="crash__button"
              onClick={() => location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
