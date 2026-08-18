import type { Tab } from './TabSwitcher'

// 'upload' survives as an icon (now used for the inline upload button on
// Translate) even though it's no longer a nav destination in its own right —
// see TabSwitcher's Tab type, which dropped it when Upload merged in.
type IconName = Tab | 'upload'

/* The section icons, defined once.
 *
 * They used to be written twice — inline in TabSwitcher and again in
 * AboutSheet — with identical `type` and `translate` glyphs and an `upload`
 * that had already drifted apart: an upload arrow in the tab bar, a photo
 * frame in the About sheet. Two pictures for one destination is a small thing
 * that quietly teaches people the wrong shape, and it is the predictable
 * outcome of keeping two copies.
 *
 * The arrow is the one that survives. The tab bar is where people actually
 * choose this section, and the section takes PDFs, DOCX and text as well as
 * images, so a photo frame was the narrower and less accurate of the two.
 *
 * Size is a prop because the two call sites genuinely differ: 20px in the tab
 * bar, 18px in the sheet's section list.
 */
function iconProps(size: number) {
  return {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
}

export function SectionIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  const props = iconProps(size)

  if (name === 'type') {
    return (
      <svg {...props}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    )
  }

  if (name === 'calendar') {
    return (
      <svg {...props}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M8 3v4M16 3v4M3 10h18" />
      </svg>
    )
  }

  if (name === 'upload') {
    return (
      <svg {...props}>
        <path d="M12 15V4" />
        <path d="M7.5 8.5 12 4l4.5 4.5" />
        <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      </svg>
    )
  }

  return (
    <svg {...props}>
      <path d="M4 7h9M4 7l3-3M4 7l3 3" />
      <path d="M20 17h-9M20 17l-3-3M20 17l-3 3" />
    </svg>
  )
}
