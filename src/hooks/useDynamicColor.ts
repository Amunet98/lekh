import { useSyncExternalStore } from 'react'
import {
  getDynamicColorState,
  subscribeDynamicColor,
  type DynamicColorState,
} from '../lib/dynamicColor'

/* The store lives in the module, not in a provider, because it is answered by
 * one bridge call at startup and read by one control. A context for a single
 * boolean pair would be more wiring than the thing being wired.
 *
 * getDynamicColorState returns the same object identity until something
 * actually changes — required, or useSyncExternalStore loops. */
export function useDynamicColor(): DynamicColorState {
  return useSyncExternalStore(subscribeDynamicColor, getDynamicColorState, getDynamicColorState)
}
