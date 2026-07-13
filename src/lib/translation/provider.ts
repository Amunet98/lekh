import type { Language } from './languages'

export interface TranslateOptions {
  onProgress?: (fraction: number) => void
}

// Load-bearing abstraction: the UI only ever talks to this interface, never
// branches on which implementation is active (mymemory vs on-device) except
// for user-facing copy/messaging.
export interface TranslationProvider {
  readonly id: 'mymemory' | 'ondevice'
  translate(
    text: string,
    source: Language,
    target: Language,
    options?: TranslateOptions,
  ): Promise<string>
}
