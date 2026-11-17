import { Capacitor, registerPlugin } from '@capacitor/core'
import { TextToSpeech, QueueStrategy } from '@capacitor-community/text-to-speech'
import { isNativeApp } from './androidApp'

/* READ ALOUD (2.0.3)
 *
 * The phone's own voice, not one of ours: the owner chose the system engine
 * (option 1 of three, 2026-11-17) over bundling an open Nepali voice (Piper,
 * 28-77 MB) or a server voice (the good Nepali ones need a credit card).
 * Google's Speech Services lists Nepali (Nepal), and its voice data can be
 * downloaded for offline use — checked on the emulator the same day.
 *
 * Two engines, one interface:
 *
 * - The app: @capacitor-community/text-to-speech, because the Android WebView
 *   has no speechSynthesis at all (it is a Chrome feature). Gated on
 *   isPluginAvailable like every plugin here: capacitor.config.ts points the
 *   WebView at the live site, so this code also runs inside APKs built before
 *   the plugin existed, and there the button must simply not exist.
 * - The website: the browser's speechSynthesis, and only where it actually
 *   has a voice for the language. Desktop browsers mostly have no Nepali one,
 *   and a speaker button that says nothing is worse than none.
 *
 * In the app a missing Nepali voice is shown rather than hidden: the button is
 * how people find out their phone can do this, and tapping it takes them to
 * the screen that fixes it (openVoiceSettings).
 */

export type SpeechLang = 'ne' | 'en'

/** ready: it can speak. missing: the app could, once a voice is installed.
 *  none: not here at all — render nothing. */
export type VoiceState = 'ready' | 'missing' | 'none'

const NATIVE = isNativeApp() && Capacitor.isPluginAvailable('TextToSpeech')

interface VoiceSettingsPlugin {
  open(): Promise<void>
}
const VoiceSettings = registerPlugin<VoiceSettingsPlugin>('VoiceSettings')

const TAG: Record<SpeechLang, string> = { ne: 'ne-NP', en: 'en-US' }

/* A touch slower for Nepali: the listener is often someone hearing it from
   a phone held out to them, and Google's Nepali voice at 1.0 runs words
   together. English stays at the engine's default. */
const RATE: Record<SpeechLang, number> = { ne: 0.9, en: 1 }

function webSynth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

function webVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
  const synth = webSynth()
  if (!synth) return null
  const voices = synth.getVoices()
  return (
    voices.find((v) => v.lang.toLowerCase() === TAG[lang].toLowerCase()) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
    null
  )
}

/* Chrome fills getVoices() asynchronously: the first call on a fresh page is
   often empty. Wait for voiceschanged, but not forever — some browsers never
   fire it, and an empty list then is the real answer. */
function webVoicesReady(): Promise<void> {
  const synth = webSynth()
  if (!synth || synth.getVoices().length > 0) return Promise.resolve()
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener('voiceschanged', done)
      resolve()
    }
    synth.addEventListener('voiceschanged', done)
    setTimeout(done, 1500)
  })
}

export async function voiceState(lang: SpeechLang): Promise<VoiceState> {
  if (NATIVE) {
    try {
      const { supported } = await TextToSpeech.isLanguageSupported({ lang: TAG[lang] })
      return supported ? 'ready' : 'missing'
    } catch {
      return 'none'
    }
  }
  if (isNativeApp()) return 'none' // an APK from before the plugin
  await webVoicesReady()
  return webVoice(lang) ? 'ready' : 'none'
}

/* Android's engine refuses one utterance over getMaxSpeechInputLength()
   (4,000 chars on Google's), and a long translation can be longer. Split at
   sentence ends — the danda as well as . ? ! — into pieces well under it, and
   speak them one after another. */
const PIECE = 1200

export function pieces(text: string): string[] {
  const sentences = text.match(/[^।॥.!?\n]+[।॥.!?\n]*/g) ?? [text]
  const out: string[] = []
  let cur = ''
  for (const s of sentences) {
    if (cur && cur.length + s.length > PIECE) {
      out.push(cur)
      cur = ''
    }
    // A single "sentence" longer than a piece (no punctuation at all) is cut
    // at the last space before the limit.
    let rest = s
    while (rest.length > PIECE) {
      const cut = rest.lastIndexOf(' ', PIECE)
      const at = cut > PIECE / 2 ? cut : PIECE
      out.push(rest.slice(0, at))
      rest = rest.slice(at)
    }
    cur += rest
  }
  if (cur.trim()) out.push(cur)
  return out.map((p) => p.trim()).filter(Boolean)
}

/* What is speaking, app-wide, so starting one line stops another and every
   button knows whether it is the one playing. */
let current: string | null = null
let run = 0
const listeners = new Set<() => void>()
function set(key: string | null) {
  current = key
  listeners.forEach((l) => l())
}
export function subscribeSpeaking(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function speakingKey(): string | null {
  return current
}

export async function stopSpeaking(): Promise<void> {
  run++
  set(null)
  try {
    if (NATIVE) await TextToSpeech.stop()
    else webSynth()?.cancel()
  } catch {
    /* nothing was playing */
  }
}

/** Speak [text]; resolves when it ends or is stopped. [key] names the button
 *  that started it. Rejects if the engine refuses. */
export async function speak(key: string, text: string, lang: SpeechLang): Promise<void> {
  await stopSpeaking()
  const mine = ++run
  set(key)
  try {
    for (const piece of pieces(text)) {
      if (mine !== run) return
      if (NATIVE) {
        await TextToSpeech.speak({
          text: piece,
          lang: TAG[lang],
          rate: RATE[lang],
          queueStrategy: QueueStrategy.Flush,
        })
      } else {
        await new Promise<void>((resolve, reject) => {
          const u = new SpeechSynthesisUtterance(piece)
          u.lang = TAG[lang]
          u.rate = RATE[lang]
          const voice = webVoice(lang)
          if (voice) u.voice = voice
          u.onend = () => resolve()
          // cancel() from stopSpeaking ends an utterance with "interrupted";
          // that is a stop, not a failure.
          u.onerror = (e) =>
            e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(new Error(e.error))
          webSynth()!.speak(u)
        })
      }
    }
  } finally {
    if (mine === run) set(null)
  }
}

/** Open the screen that gets this phone a Nepali voice. False if there is
 *  none to open (the website, or an APK from before VoiceSettingsPlugin). */
export async function openVoiceSettings(): Promise<boolean> {
  if (!NATIVE || !Capacitor.isPluginAvailable('VoiceSettings')) return false
  try {
    await VoiceSettings.open()
    return true
  } catch {
    return false
  }
}
