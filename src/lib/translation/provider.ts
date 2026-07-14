import type { Language } from './languages'

// Model-load progress phases for the on-device provider:
// downloading — model files streaming in (byte counts aggregated across files)
// preparing   — files fetched (or cache-hit); ONNX session init in progress
// done        — pipeline ready; inference about to run
export type ModelLoadProgress =
  | { phase: 'downloading'; loadedBytes: number; totalBytes: number }
  | { phase: 'preparing' }
  | { phase: 'done' }

export interface TranslateOptions {
  onModelProgress?: (progress: ModelLoadProgress) => void
}

// Load-bearing abstraction: the UI only ever talks to this interface, never
// branches on which implementation is active (online vs on-device) except
// for user-facing copy/messaging.
export interface TranslationProvider {
  readonly id: 'google' | 'mymemory' | 'online' | 'ondevice'
  translate(
    text: string,
    source: Language,
    target: Language,
    options?: TranslateOptions,
  ): Promise<string>
}
