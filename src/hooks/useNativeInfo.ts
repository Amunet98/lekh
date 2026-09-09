import { useSyncExternalStore } from 'react'
import { getNativeInfo, subscribeNativeInfo, type NativeInfo } from '../lib/nativeInfo'

/* Re-renders the two version lines once the Capacitor bridge answers. Both are
   mounted before it does — see the store comment in nativeInfo.ts. */
export function useNativeInfo(): NativeInfo | null {
  return useSyncExternalStore(subscribeNativeInfo, getNativeInfo, () => null)
}
