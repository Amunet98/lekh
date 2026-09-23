export interface Language {
  code: string // ISO 639-1, used by the MyMemory API
  nllb: string // NLLB-200 code, used by the on-device model
  label: string
  /* The language's name in its own script, for the pane headers.
   *
     Only the pane headers, and deliberately not the pickers: those are a
     control for choosing between two languages and have to be legible to
     someone who cannot yet read the other one, so they stay Latin. A header
     is naming the text underneath it, which is already in that script.
   *
     Not paired with the Latin name either — `नेपाली · Nepali` under a pane of
     Nepali is the same word twice, which reads as a stutter rather than as a
     label. The pickers a few centimetres above say `Nepali` in Latin for
     anyone who needs it. */
  native: string
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
export const ENGLISH: Language = { code: 'en', nllb: 'eng_Latn', label: 'English', native: 'English', script: 'A' }
export const NEPALI: Language = { code: 'ne', nllb: 'npi_Deva', label: 'Nepali', native: 'नेपाली', script: 'अ' }
