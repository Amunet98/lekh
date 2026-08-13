/* The one-word claims about what Lekh is, in the order they matter.
 *
 * These are rendered as pills in the About sheet — they were on the boot
 * screen too until the redesign cut it back to a wordmark and a progress
 * line, which is why there is no longer a BOOT_KEYWORDS subset here. Every
 * one of them has to be *true of the shipped app*; they read as a spec,
 * not as marketing. "Offline" means the typing engine and the on-device
 * translation model work with the network off; "No account" means there is no
 * auth anywhere in the codebase. If a claim stops being true, delete it here
 * rather than softening the wording.
 *
 * The Devanagari half is not a translation label — it is the point of the
 * product being demonstrated in the chip itself. */
export interface Keyword {
  /** Latin term. Short — these wrap on a 375px screen. */
  term: string
  /** Devanagari gloss, shown beside the term. */
  dev?: string
}

export const KEYWORDS: Keyword[] = [
  { term: 'Offline', dev: 'अफलाइन' },
  { term: 'Private', dev: 'निजी' },
  { term: 'Devanagari', dev: 'देवनागरी' },
  { term: 'Phonetic', dev: 'उच्चारण' },
  { term: 'OCR', dev: 'तस्बिरबाट' },
  { term: 'Translate', dev: 'अनुवाद' },
  { term: 'Installable' },
  { term: 'No account' },
  { term: 'Free' },
]
