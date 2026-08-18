// 450 chars stays safely under MyMemory's ~500-char anonymous-query cap (the
// online fallback provider) and under NLLB's practical input length on-device
// — both providers get one shared chunk size rather than two thresholds to
// keep in sync.
const MAX_CHUNK_CHARS = 450

// Devanagari's full stop (।) counts as a sentence terminator alongside the
// Latin ones, since source text can be Nepali (ne-en direction).
const SENTENCE_SPLIT = /[^.!?।]+[.!?।]*\s*/g

/**
 * Splits text into pieces no larger than maxChars, breaking on paragraph
 * boundaries first and falling back to sentence (then hard character)
 * boundaries only where a single paragraph is itself too long — so a normal
 * multi-paragraph document keeps its natural breaks instead of being cut
 * mid-sentence. Returns a single-element array unchanged when the whole text
 * already fits, so short translations take the exact same one-request path
 * they always have.
 */
export function chunkText(text: string, maxChars = MAX_CHUNK_CHARS): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.length <= maxChars) return [trimmed]

  const chunks: string[] = []
  const paragraphs = trimmed.split(/\n{2,}/)
  let current = ''

  const flush = () => {
    if (current) {
      chunks.push(current.trim())
      current = ''
    }
  }

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }
    flush()
    if (paragraph.length <= maxChars) {
      current = paragraph
      continue
    }
    chunks.push(...splitLongParagraph(paragraph, maxChars))
  }
  flush()
  return chunks
}

function splitLongParagraph(paragraph: string, maxChars: number): string[] {
  const sentences = paragraph.match(SENTENCE_SPLIT) ?? [paragraph]
  const pieces: string[] = []
  let current = ''

  for (const sentence of sentences) {
    const candidate = current + sentence
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }
    if (current) pieces.push(current.trim())
    if (sentence.length <= maxChars) {
      current = sentence
      continue
    }
    // No punctuation anywhere in this run to break on — hard-split by
    // character count as a last resort so this always terminates.
    for (let i = 0; i < sentence.length; i += maxChars) {
      pieces.push(sentence.slice(i, i + maxChars).trim())
    }
    current = ''
  }
  if (current) pieces.push(current.trim())
  return pieces.filter(Boolean)
}
