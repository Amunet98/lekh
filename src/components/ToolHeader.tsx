import type { ReactNode } from 'react'

/* The head of a Tools card: an accent tile, then the name in Nepali over a
 * line of English. The tile is the same shape and weight as Patro's holiday
 * day badges — a rounded square in --accent-bg holding one Devanagari mark —
 * so the new tab reads as part of the same app rather than a page of grey
 * forms. --accent rather than --bida on purpose: the badges mean "holiday"
 * and keep their crimson under Material You, while these are just this app's
 * own colour and should follow the wallpaper with everything else. */
export function ToolHeader({ id, badge, ne, en }: { id: string; badge: ReactNode; ne: string; en: string }) {
  return (
    <div className="tool-head">
      <span className="tool-head__badge dev" aria-hidden="true">
        {badge}
      </span>
      <h2 className="tool-head__title" id={id}>
        <span className="tool-head__ne dev" lang="ne">
          {ne}
        </span>
        <span className="tool-head__en">{en}</span>
      </h2>
    </div>
  )
}
