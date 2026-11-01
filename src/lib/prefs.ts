/* Preferences, in one place, with one shape.
 *
 * Every setting in the app used to hand-roll its own localStorage access:
 * the same try/catch, the same "what if this is a string that isn't one of
 * my values", written out again per file. That is fine for one flag and it
 * is how six of them ended up with three different fallback behaviours.
 *
 * Everything is validated on the way out, because localStorage is shared with
 * every past and future version of this app and a value written by one of
 * them is not a value this one has to understand. Anything unrecognised
 * becomes the default rather than reaching a component as a surprise.
 *
 * Not covered here on purpose: the editor and translate drafts (they are
 * content, not preferences, and are large), the theme (it also has to be read
 * by the FOUC bootstrap in index.html before any module loads) and the
 * Material You palette cache. Those keep their own storage.
 */

import type { Tab } from '../components/TabSwitcher'

export type EditorSize = 'md' | 'lg' | 'xl'

/** The Tools tab's tools, in the order its switcher shows them. */
export const TOOL_IDS = ['date', 'money', 'preeti', 'phrases'] as const
export type ToolId = (typeof TOOL_IDS)[number]

export interface Prefs {
  /** Editor and translate-pane text size. Scales up only — the default is
   *  already at the 16px floor under which iOS zooms the page on focus. */
  editorSize: EditorSize
  /** Open on whichever section was last used, rather than always on Type. */
  restoreLastTab: boolean
  /** Which that was. Written whether or not the setting above is on. */
  lastTab: Tab
  /** Start the Type tab converting, rather than in plain English. */
  startNepali: boolean
  /** Deep blacks for OLED screens. A modifier on the dark theme, not a theme
   *  of its own — see the block it drives in index.css. */
  amoled: boolean
  /** Remember Online vs on-device between launches. */
  translateOnDevice: boolean
  /** Remember which way the translation was pointing. */
  translateReversed: boolean
  /** Which tool the Tools tab opens on — the one used last. */
  tool: ToolId
  /** The Money tool's last foreign currency, as an ISO code. Validated only
   *  as the shape of one: the list comes from NRB, and a code it stops
   *  quoting falls back to USD or the first in the list at render time. */
  currency: string
  /** Draw the Android home-screen widgets in English rather than Nepali. The
   *  widgets keep their own copy (they cannot read localStorage); see
   *  syncWidgetLanguage in dynamicColor.ts. */
  widgetEnglish: boolean
  /** Type: the strip under the text showing it in Preeti keys (1.9.96). */
  preetiStrip: boolean
}

const DEFAULTS: Prefs = {
  editorSize: 'md',
  restoreLastTab: false,
  lastTab: 'type',
  startNepali: true,
  amoled: false,
  translateOnDevice: false,
  translateReversed: false,
  tool: 'date',
  currency: 'USD',
  widgetEnglish: false,
  preetiStrip: false,
}

const KEY_PREFIX = 'lekh:pref:'

const VALIDATORS: { [K in keyof Prefs]: (raw: unknown) => Prefs[K] | undefined } = {
  editorSize: (raw) => (raw === 'md' || raw === 'lg' || raw === 'xl' ? raw : undefined),
  restoreLastTab: (raw) => (typeof raw === 'boolean' ? raw : undefined),
  lastTab: (raw) =>
    raw === 'type' || raw === 'translate' || raw === 'calendar' || raw === 'tools' ? raw : undefined,
  startNepali: (raw) => (typeof raw === 'boolean' ? raw : undefined),
  amoled: (raw) => (typeof raw === 'boolean' ? raw : undefined),
  translateOnDevice: (raw) => (typeof raw === 'boolean' ? raw : undefined),
  translateReversed: (raw) => (typeof raw === 'boolean' ? raw : undefined),
  /* Amount and Currency merged into Money in 1.9.94; someone who last used
     either still opens on it. */
  tool: (raw) =>
    raw === 'amount' || raw === 'currency'
      ? 'money'
      : TOOL_IDS.includes(raw as ToolId)
        ? (raw as ToolId)
        : undefined,
  currency: (raw) => (typeof raw === 'string' && /^[A-Z]{3}$/.test(raw) ? raw : undefined),
  widgetEnglish: (raw) => (typeof raw === 'boolean' ? raw : undefined),
  preetiStrip: (raw) => (typeof raw === 'boolean' ? raw : undefined),
}

export function getPref<K extends keyof Prefs>(key: K): Prefs[K] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + key)
    if (raw === null) return DEFAULTS[key]
    const parsed = VALIDATORS[key](JSON.parse(raw) as unknown)
    return parsed === undefined ? DEFAULTS[key] : parsed
  } catch {
    // Blocked storage, or a value that isn't JSON at all.
    return DEFAULTS[key]
  }
}

/* Subscribers rather than a store: there is one settings sheet and a handful
   of readers, and the readers care about different keys. A listener per key
   keeps a font-size change from re-rendering the calendar. */
const listeners = new Map<keyof Prefs, Set<() => void>>()

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  try {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value))
  } catch {
    // Blocked storage — the setting still applies for this session.
  }
  listeners.get(key)?.forEach((fn) => fn())
}

export function subscribePref(key: keyof Prefs, fn: () => void): () => void {
  const set = listeners.get(key) ?? new Set<() => void>()
  set.add(fn)
  listeners.set(key, set)
  return () => set.delete(fn)
}
