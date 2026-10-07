/* Numbers the way Nepal writes them: grouped in lakh and crore (12,34,567),
 * in Devanagari or Western digits, and in words — Nepali and English — for a
 * cheque, a form, or a price someone cannot read.
 *
 * Nepali number words below a hundred do not follow a rule (२९ is उनन्तीस,
 * "one short of thirty", and ७९ is उनासी), so they are a table, not a
 * calculation. Spellings follow the ones already in the typing dictionary
 * (दस, सय) where they overlap. */

const NE_0_99 = [
  'शून्य', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ',
  'दस', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस',
  'बीस', 'एक्काइस', 'बाइस', 'तेइस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताइस', 'अट्ठाइस', 'उनन्तीस',
  'तीस', 'एकतीस', 'बत्तीस', 'तेत्तीस', 'चौँतीस', 'पैँतीस', 'छत्तीस', 'सैँतीस', 'अठतीस', 'उनन्चालीस',
  'चालीस', 'एकचालीस', 'बयालीस', 'त्रिचालीस', 'चवालीस', 'पैँतालीस', 'छयालीस', 'सतचालीस', 'अठचालीस', 'उनन्पचास',
  'पचास', 'एकाउन्न', 'बाउन्न', 'त्रिपन्न', 'चउन्न', 'पचपन्न', 'छपन्न', 'सन्ताउन्न', 'अन्ठाउन्न', 'उनन्साठी',
  'साठी', 'एकसट्ठी', 'बयसट्ठी', 'त्रिसट्ठी', 'चौँसट्ठी', 'पैँसट्ठी', 'छयसट्ठी', 'सतसट्ठी', 'अठसट्ठी', 'उनन्सत्तरी',
  'सत्तरी', 'एकहत्तर', 'बहत्तर', 'त्रिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छयहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी',
  'असी', 'एकासी', 'बयासी', 'त्रियासी', 'चौरासी', 'पचासी', 'छयासी', 'सतासी', 'अठासी', 'उनान्नब्बे',
  'नब्बे', 'एकानब्बे', 'बयानब्बे', 'त्रियानब्बे', 'चौरानब्बे', 'पन्चानब्बे', 'छयानब्बे', 'सन्तानब्बे', 'अन्ठानब्बे', 'उनान्सय',
]

const EN_ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
]
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/* The South Asian scale. Every step above हजार is a factor of a hundred, so
   the count in front of each word is always 1–99. नील stops it at 10^15,
   which is a figure nobody is writing on a cheque. */
const SCALES: [number, string, string][] = [
  [1e13, 'नील', 'neel'],
  [1e11, 'खर्ब', 'kharab'],
  [1e9, 'अर्ब', 'arab'],
  [1e7, 'करोड', 'crore'],
  [1e5, 'लाख', 'lakh'],
  [1e3, 'हजार', 'thousand'],
  [1e2, 'सय', 'hundred'],
]

export const MAX_WHOLE = 1e15 - 1

const DEVANAGARI_ZERO = '०'.charCodeAt(0)

export function toDevanagariDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => String.fromCharCode(DEVANAGARI_ZERO + Number(d)))
}

export function toWesternDigits(text: string): string {
  return text.replace(/[०-९]/g, (d) => String(d.charCodeAt(0) - DEVANAGARI_ZERO))
}

export interface ParsedAmount {
  whole: number
  /** Two digits after the point, as paisa (0–99), or null when none were typed. */
  paisa: number | null
}

/** Reads what someone typed: either script's digits, any commas or spaces, at
 *  most one decimal point. null for anything else, or past MAX_WHOLE. */
export function parseAmount(raw: string): ParsedAmount | null {
  const text = toWesternDigits(raw).replace(/[,\s]/g, '')
  const m = /^(\d+)(?:\.(\d{0,2}))?$/.exec(text)
  if (!m) return null
  const whole = Number(m[1])
  if (!Number.isSafeInteger(whole) || whole > MAX_WHOLE) return null
  const paisa = m[2] ? Number(m[2].padEnd(2, '0')) : null
  return { whole, paisa }
}

/** 1234567 → "12,34,567": the last three digits, then pairs. */
export function groupNepali(whole: number): string {
  const s = String(whole)
  if (s.length <= 3) return s
  const head = s.slice(0, -3)
  const pairs = head.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${pairs},${s.slice(-3)}`
}

function chunks(n: number): [number, number | null][] {
  // [count, scale index] pairs, largest first; scale null for the 0–99 tail.
  const out: [number, number | null][] = []
  let rest = n
  SCALES.forEach(([size], i) => {
    const count = Math.floor(rest / size)
    if (count > 0) {
      out.push([count, i])
      rest -= count * size
    }
  })
  if (rest > 0) out.push([rest, null])
  return out
}

export function nepaliWords(n: number): string {
  if (n === 0) return NE_0_99[0]
  return chunks(n)
    .map(([count, scale]) => (scale === null ? NE_0_99[count] : `${NE_0_99[count]} ${SCALES[scale][1]}`))
    .join(' ')
}

function englishUnder100(n: number): string {
  if (n < 20) return EN_ONES[n]
  const tens = EN_TENS[Math.floor(n / 10)]
  return n % 10 ? `${tens}-${EN_ONES[n % 10]}` : tens
}

export function englishWords(n: number): string {
  if (n === 0) return EN_ONES[0]
  return chunks(n)
    .map(([count, scale]) =>
      scale === null ? englishUnder100(count) : `${englishUnder100(count)} ${SCALES[scale][2]}`,
    )
    .join(' ')
}

/** The cheque line: "बाह्र हजार पाँच सय रुपैयाँ पचास पैसा मात्र". */
export function nepaliAmount({ whole, paisa }: ParsedAmount): string {
  const parts = [`${nepaliWords(whole)} रुपैयाँ`]
  if (paisa) parts.push(`${NE_0_99[paisa]} पैसा`)
  return `${parts.join(' ')} मात्र`
}

/** "Rupees twelve thousand five hundred and fifty paisa only". */
export function englishAmount({ whole, paisa }: ParsedAmount): string {
  const words = `Rupees ${englishWords(whole)}`
  return paisa ? `${words} and ${englishUnder100(paisa)} paisa only` : `${words} only`
}
