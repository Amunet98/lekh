import { useCallback, useEffect, useState } from 'react'
import { Sheet } from './Sheet'
import { useTheme } from '../hooks/useTheme'
import { usePref } from '../hooks/usePref'
import { useDynamicColor } from '../hooks/useDynamicColor'
import { setDynamicColorEnabled } from '../lib/dynamicColor'
import { setHapticsEnabled, tick } from '../lib/haptics'
import { clearHeavyCaches, estimateHeavyCaches, formatBytes } from '../lib/storage'
import { useToast } from '../hooks/useToast'
import type { Theme } from '../lib/theme'
import type { EditorSize } from '../lib/prefs'

import './SettingsSheet.css'

/* Settings, which the app did not have.
 *
 * Preferences were scattered: the theme lived in the app bar, Material You was
 * buried in the About sheet, and everything else — conversion mode, translation
 * mode and direction — was per-session state that reset on every launch, so
 * setting it was not really setting anything. An app has one place you go to
 * change how it behaves, and About is not it: About says what the app is.
 *
 * Rows use the shared .sheet-row language (sheet.css) so this and About are
 * plainly the same furniture. The segmented controls are this file's own —
 * three mutually exclusive values read better side by side than as three
 * switches or as a cycling button whose other states you cannot see.
 */

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  /* About is reached from the last row of this sheet rather than from its own
     icon in the app bar. Two icons was a lot of chrome for a phone, and of the
     two the ⓘ was the one nobody needed twice — About is read once. It stays
     its own sheet: a headline, a demo and a byline do not belong among
     switches, and the version string is easier to find at the end of a short
     list than buried under toggles. */
  onOpenAbout: () => void
}

const THEMES: { id: Theme; label: string }[] = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

/* Upward only. The default is already 1.05rem, and at the narrowest
   breakpoint exactly 1rem — the floor under which iOS zooms the page when a
   field takes focus, which on a typing app means every session starts by
   jerking the layout sideways. A "smaller" option would have to break it. */
const SIZES: { id: EditorSize; label: string }[] = [
  { id: 'md', label: 'Default' },
  { id: 'lg', label: 'Large' },
  { id: 'xl', label: 'Larger' },
]

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (next: T) => void
}) {
  return (
    <div className="settings__seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`settings__seg-btn${value === option.id ? ' settings__seg-btn--active' : ''}`}
          aria-pressed={value === option.id}
          onClick={() => {
            if (value === option.id) return
            tick()
            onChange(option.id)
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function SwitchRow({
  title,
  rest,
  checked,
  onChange,
}: {
  title: string
  rest: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      type="button"
      className="sheet-row sheet-row--switch"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        /* Before the state change, so the switch that turns haptics *off*
           still confirms the press that turned it off. */
        tick()
        onChange(!checked)
      }}
    >
      <span className="sheet-row__text">
        <b>{title}</b>
        <span className="sheet-row__rest">{rest}</span>
      </span>
      <span className="sheet-switch" aria-hidden="true">
        <span className="sheet-switch-thumb" />
      </span>
    </button>
  )
}

export function SettingsSheet({ open, onClose, onOpenAbout }: SettingsSheetProps) {
  const toast = useToast()
  const [theme, setTheme] = useTheme()
  const [editorSize, setEditorSize] = usePref('editorSize')
  const [haptics, setHaptics] = usePref('haptics')
  const [restoreLastTab, setRestoreLastTab] = usePref('restoreLastTab')
  const [startNepali, setStartNepali] = usePref('startNepali')
  const dynamicColor = useDynamicColor()

  /* Measured while the sheet is open, not on mount: walking three caches to
     add up Content-Length is real work, and nobody is owed the number until
     they come looking for it. Re-measured on each open so it is still true
     after a model download or a clear. */
  const [cacheBytes, setCacheBytes] = useState<number | null>(null)
  const [clearing, setClearing] = useState(false)

  const measure = useCallback(() => {
    void estimateHeavyCaches().then(setCacheBytes)
  }, [])

  useEffect(() => {
    if (open) measure()
  }, [open, measure])

  const clear = async () => {
    setClearing(true)
    try {
      await clearHeavyCaches()
      measure()
      toast.done('Downloaded extras cleared')
    } catch {
      toast.problem('Could not clear the downloads')
    } finally {
      setClearing(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} labelledBy="settings-title">
      <h2 id="settings-title" className="settings__title">
        Settings
      </h2>

      <section className="settings__group">
        <h3 className="settings__group-title">Appearance</h3>
        <div className="sheet-row sheet-row--stack">
          <span className="sheet-row__text">
            <b>Theme</b>
            <span className="sheet-row__rest">
              {theme === 'auto' ? 'following your device' : `always ${theme}`}
            </span>
          </span>
          <Segmented label="Theme" value={theme} options={THEMES} onChange={setTheme} />
        </div>

        <div className="sheet-row sheet-row--stack">
          <span className="sheet-row__text">
            <b>Text size</b>
            <span className="sheet-row__rest">in the editor and the translation panes</span>
          </span>
          <Segmented
            label="Text size"
            value={editorSize}
            options={SIZES}
            onChange={setEditorSize}
          />
        </div>

        {/* Android 12 and up, in the app only — the same condition, and the
            same opt-out framing, this row had in the About sheet before it
            moved here. A switch offering to turn off something that was never
            on is worse than no switch, so everywhere else it does not exist.
            The home-screen widgets are deliberately not covered by it: a
            widget is a citizen of the launcher before it is part of this app,
            and the only widgets that look wrong are the ones that ignore the
            wallpaper. */}
        {dynamicColor.supported && (
          <SwitchRow
            title="Wallpaper colours"
            rest={
              dynamicColor.enabled
                ? 'following your Material You theme'
                : 'off — using Lekh’s own crimson'
            }
            checked={dynamicColor.enabled}
            onChange={(next) => setDynamicColorEnabled(next)}
          />
        )}
      </section>

      <section className="settings__group">
        <h3 className="settings__group-title">Behaviour</h3>
        <SwitchRow
          title="Vibration"
          rest="a tap when something is selected or finished"
          checked={haptics}
          onChange={(next) => {
            setHaptics(next)
            setHapticsEnabled(next)
          }}
        />
        <SwitchRow
          title="Open where I left off"
          rest={restoreLastTab ? 'reopens your last section' : 'always opens on Type'}
          checked={restoreLastTab}
          onChange={setRestoreLastTab}
        />
        <SwitchRow
          title="Start in Nepali"
          rest={startNepali ? 'the editor converts as you type' : 'the editor starts in plain English'}
          checked={startNepali}
          onChange={setStartNepali}
        />
      </section>

      <section className="settings__group">
        <h3 className="settings__group-title">Storage</h3>
        {/* The on-device translation model is ~900MB and the OCR and PDF
            engines another ~19MB, all downloaded silently on first use and
            kept forever. Until now the only way to get that space back was to
            clear site data for the whole app — which also takes the draft, the
            theme and every setting on this screen with it. */}
        <div className="sheet-row sheet-row--stack">
          <span className="sheet-row__text">
            <b>Downloaded extras</b>
            <span className="sheet-row__rest">
              {cacheBytes === null
                ? 'the on-device model, OCR and PDF engines'
                : cacheBytes === 0
                  ? 'nothing downloaded yet'
                  : `${formatBytes(cacheBytes)} — the on-device model, OCR and PDF engines`}
            </span>
          </span>
          <button
            type="button"
            className="settings__danger"
            disabled={clearing || cacheBytes === 0}
            onClick={() => void clear()}
          >
            {clearing ? 'clearing…' : 'clear'}
          </button>
        </div>
      </section>

      {/* Last, and outside the groups above, because it is the one row here
          that is not a setting. The version rides along as the row's subtitle:
          it is the thing people are asked for when something looks wrong, and
          it used to take opening a second sheet to find. */}
      <button type="button" className="sheet-row sheet-row--aside" onClick={onOpenAbout}>
        <span className="sheet-row__icon">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5" />
            <path d="M12 7.75h.01" />
          </svg>
        </span>
        <span className="sheet-row__text">
          <b>About Lekh Patro</b>
          <span className="sheet-row__rest">web build {__APP_VERSION__}</span>
        </span>
        <span className="sheet-row__go" aria-hidden="true">
          →
        </span>
      </button>
    </Sheet>
  )
}
