import { useEffect, useState } from 'react'

/* Whether the device thinks it has a network.
 *
 * navigator.onLine was consulted in exactly one place — the OCR failure path,
 * to tell "genuinely bad photo" apart from "offline and nothing cached yet" —
 * and nowhere else, so online translation simply failed on submit with a
 * service-unavailable message that named the wrong problem.
 *
 * It answers "is there a network interface", not "is the internet reachable",
 * so a true here is a hope and a false here is a fact. Only the false is acted
 * on, which is the way round that stays correct.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() => {
    try {
      return navigator.onLine
    } catch {
      return true
    }
  })

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  return online
}
