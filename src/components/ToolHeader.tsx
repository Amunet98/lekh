/* The head of a Tools panel: the name in Nepali over a line of English.
 *
 * There used to be an accent tile beside it holding one Devanagari mark, the
 * same shape as Patro's holiday badges. It went when the tools moved behind a
 * switcher (ToolsPage): the switcher's tile already says which tool this is,
 * with a drawn icon, and a second tile directly under it was the same signal
 * twice. */
export function ToolHeader({ id, ne, en }: { id: string; ne: string; en: string }) {
  return (
    <h2 className="tool-head" id={id}>
      <span className="tool-head__ne dev" lang="ne">
        {ne}
      </span>
      <span className="tool-head__en">{en}</span>
    </h2>
  )
}
