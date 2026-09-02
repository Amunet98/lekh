import { createContext, useContext } from 'react'

/* The context and its hook live apart from <ToastProvider> because a module
   that exports both a component and a plain function loses Vite's fast
   refresh for the whole file. Same split as any other hook here. */

export interface ToastApi {
  /** Confirm something finished. Fires the confirm haptic. */
  done: (text: string) => void
  /** Report something that failed or is unavailable. Fires the warn haptic. */
  problem: (text: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

/* Throws rather than returning a no-op when there is no provider. A silent
   no-op here means an error the user was supposed to see simply never
   appears, and nothing anywhere reports that it didn't. */
export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast must be used inside <ToastProvider>')
  return api
}
