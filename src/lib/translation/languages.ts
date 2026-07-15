export interface Language {
  code: string // ISO 639-1, used by the MyMemory API
  nllb: string // NLLB-200 code, used by the on-device model
  label: string
}

// Scoped to English<->Nepali only for this pass — see project notes on the
// upload-a-document feature. TranslationProvider itself is language-agnostic;
// widening this back out later doesn't require touching the providers.
export const ENGLISH: Language = { code: 'en', nllb: 'eng_Latn', label: 'English' }
export const NEPALI: Language = { code: 'ne', nllb: 'npi_Deva', label: 'Nepali' }
