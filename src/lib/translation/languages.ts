export interface Language {
  code: string // ISO 639-1, used by the MyMemory API
  nllb: string // NLLB-200 code, used by the on-device model
  label: string
}

export const NEPALI: Language = { code: 'ne', nllb: 'npi_Deva', label: 'Nepali' }

export const LANGUAGES: Language[] = [
  { code: 'en', nllb: 'eng_Latn', label: 'English' },
  { code: 'hi', nllb: 'hin_Deva', label: 'Hindi' },
  { code: 'es', nllb: 'spa_Latn', label: 'Spanish' },
  { code: 'fr', nllb: 'fra_Latn', label: 'French' },
  { code: 'zh', nllb: 'zho_Hans', label: 'Chinese' },
  { code: 'ar', nllb: 'arb_Arab', label: 'Arabic' },
  { code: 'pt', nllb: 'por_Latn', label: 'Portuguese' },
  { code: 'ru', nllb: 'rus_Cyrl', label: 'Russian' },
  { code: 'ja', nllb: 'jpn_Jpan', label: 'Japanese' },
  { code: 'de', nllb: 'deu_Latn', label: 'German' },
]

export const ALL_LANGUAGES: Language[] = [...LANGUAGES, NEPALI]
