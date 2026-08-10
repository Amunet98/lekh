/* Tap-to-try phrases. appendSample() in useEditorState runs each word through
 * convert() before it lands in the editor, so a sample is only as good as the
 * engine's output for it — every string below was round-tripped through
 * src/lib/engine and produces correct Nepali.
 *
 * That check is not optional when adding to this list. The engine is a
 * dictionary plus a greedy phonetic parser, and plenty of plausible-looking
 * romanizations fall off the dictionary and come out wrong: `subha prabhat`
 * gives सुभ प्रभत, `nepal ma` gives नेपाल म (two words, not नेपालमा), and
 * `kripaya` gives क्रिपय. A chip that produces bad Nepali in a Nepali typing
 * app is worse than one chip fewer.
 *
 * The order is a progression, not a ranking: a greeting, then a question, then
 * sentences, then the three constructs the cheat sheet talks about but that
 * are easier to *see* than to read — retroflex capitals (DakTar → डाक्टर),
 * digits (7 → ७), and the number words. */
export const SAMPLES: string[] = [
  'namaste',
  'kasto chha',
  'mero naam ke ho',
  'sanchai hunuhunchha',
  'ma kathmandu bata ho',
  'aja mausam ramro chha',
  'malai nepali khana man parchha',
  'DakTar kaha chha',
  'bihana 7 baje',
  'ek dui tin char panch',
  'dhanyabad',
]
