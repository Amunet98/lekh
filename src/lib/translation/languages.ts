export interface Language {
  code: string // ISO 639-1, used by the MyMemory API
  nllb: string // NLLB-200 code, used by the on-device model
  label: string
  /* One letter standing for the script, for the picker rows. `अ` against `A`
     says which alphabet you are choosing between faster than either name
     does, and it is the same answer whatever language the interface is in —
     which matters for a picker that a Nepali reader and an English reader
     both have to use. */
  script: string
}

// Scoped to English<->Nepali only for this pass — see project notes on the
// upload-a-document feature. TranslationProvider itself is language-agnostic;
// widening this back out later doesn't require touching the providers.
export const ENGLISH: Language = { code: 'en', nllb: 'eng_Latn', label: 'English', script: 'A' }
export const NEPALI: Language = { code: 'ne', nllb: 'npi_Deva', label: 'Nepali', script: 'अ' }
