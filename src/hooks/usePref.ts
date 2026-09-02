import { useCallback, useSyncExternalStore } from 'react'
import { getPref, setPref, subscribePref, type Prefs } from '../lib/prefs'

/* useSyncExternalStore rather than useState + an effect: the store is outside
   React (localStorage plus a listener set), and this is the hook React
   provides for exactly that — it subscribes, re-reads on change, and gets the
   server/初 render right without a flash of the default. */
export function usePref<K extends keyof Prefs>(key: K): [Prefs[K], (value: Prefs[K]) => void] {
  const value = useSyncExternalStore(
    useCallback((onChange) => subscribePref(key, onChange), [key]),
    useCallback(() => getPref(key), [key]),
  )
  const set = useCallback((next: Prefs[K]) => setPref(key, next), [key])
  return [value, set]
}
