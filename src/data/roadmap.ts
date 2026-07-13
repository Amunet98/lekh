export interface RoadmapStage {
  name: string
  now: boolean
  description: string
}

export const ROADMAP: RoadmapStage[] = [
  {
    name: 'rules + dictionary',
    now: true,
    description:
      'Greedy phonetic parser; a frequency dictionary wins on common words. Static site, works offline.',
  },
  {
    name: 'on-device ML ranking',
    now: false,
    description:
      'A tiny seq2seq model reranks ambiguous words (पनि vs पानी) — still fully in-browser.',
  },
  {
    name: 'preeti ⇄ unicode',
    now: false,
    description:
      'Convert legacy Preeti-font documents to Unicode and back — a daily need for older Nepali documents.',
  },
  {
    name: 'installable PWA',
    now: false,
    description: 'Open once, then it works with no internet at all.',
  },
]
