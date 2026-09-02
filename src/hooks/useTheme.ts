import { useCallback, useSyncExternalStore } from 'react'
import { applyTheme, getInitialTheme, subscribeTheme, type Theme } from '../lib/theme'

/* Shared by the app-bar toggle and the Settings sheet, so the two can never
   show different answers to the same question. */
export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(subscribeTheme, getInitialTheme)
  return [theme, useCallback((next: Theme) => applyTheme(next), [])]
}
