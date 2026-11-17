import { useEffect, useId, useState, useSyncExternalStore } from 'react'
import { useToast } from '../hooks/useToast'
import { tick } from '../lib/haptics'
import {
  openVoiceSettings,
  speak,
  speakingKey,
  stopSpeaking,
  subscribeSpeaking,
  voiceState,
  type SpeechLang,
  type VoiceState,
} from '../lib/speech'
import { ToolIcon } from './tools/ToolIcons'

/* Whether this device can say [lang], re-asked whenever the app comes back to
   the front: the usual way back from "no Nepali voice" is to leave for the
   voice settings, download it, and return — and the button should work then
   without a restart. */
function useVoiceState(lang: SpeechLang): VoiceState {
  const [state, setState] = useState<VoiceState>('none')
  useEffect(() => {
    let live = true
    const check = () => void voiceState(lang).then((s) => live && setState(s))
    check()
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [lang])
  return state
}

/**
 * Read [text] aloud in the phone's own voice (see lib/speech.ts). Renders
 * nothing where there is no voice to be had, so a screen without it looks
 * exactly as it did before read aloud existed. While it speaks the speaker
 * becomes a stop square, and tapping any other speaker stops this one.
 */
export function SpeakButton({
  text,
  lang,
  what,
  className = 'btn btn--icon',
}: {
  text: string
  lang: SpeechLang
  /** For the label: "Read the translation aloud". */
  what: string
  className?: string
}) {
  const key = useId()
  const state = useVoiceState(lang)
  const toast = useToast()
  const playing = useSyncExternalStore(subscribeSpeaking, speakingKey) === key

  // A line that leaves the screen (a new translation, another topic) stops
  // talking with it.
  useEffect(() => () => {
    if (speakingKey() === key) void stopSpeaking()
  }, [key])

  if (state === 'none') return null

  const onClick = async () => {
    tick()
    if (playing) {
      void stopSpeaking()
      return
    }
    if (state === 'missing') {
      const opened = await openVoiceSettings()
      if (opened) {
        toast.done(
          lang === 'ne'
            ? 'Download “Nepali (Nepal)” there, or choose Speech Services by Google, then come back'
            : 'Download an English voice there, then come back',
        )
      } else {
        toast.problem(lang === 'ne' ? 'This phone has no Nepali voice' : 'This phone has no English voice')
      }
      return
    }
    try {
      await speak(key, text, lang)
    } catch {
      toast.problem('Could not read it aloud')
    }
  }

  return (
    <button
      type="button"
      className={className + (playing ? ' is-speaking' : '')}
      aria-label={playing ? 'Stop reading' : `Read ${what} aloud`}
      onClick={() => void onClick()}
      disabled={!text.trim()}
    >
      <ToolIcon name={playing ? 'stop' : 'speaker'} size={18} />
    </button>
  )
}
