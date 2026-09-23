/* The row icons for bottom sheets.
 *
 * Separate from SectionIcons, which is the three nav destinations and is
 * deliberately a closed set — that file exists because two copies of the same
 * destination glyph had drifted apart, and widening it into a general icon bag
 * would undo the point of it.
 *
 * Hand-drawn rather than a dependency: this project has no icon library (every
 * glyph in it is an inline SVG) and eight paths are not worth the first one.
 * Same geometry as SectionIcons so a sheet row and the tab bar look like the
 * same hand: 24 grid, no fill, 2px round-capped stroke.
 */
import type { ReactNode } from 'react'

export type SheetIconName =
  | 'share'
  | 'text'
  | 'doc'
  | 'pdf'
  | 'trash'
  | 'undo'
  | 'cloud'
  | 'device'

function props(size: number) {
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

/* The page outline the three export glyphs share, so .txt, .docx and PDF read
   as three of a kind and differ only in what is written on the page. */
function Page() {
  return (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
    </>
  )
}

export function SheetIcon({ name, size = 18 }: { name: SheetIconName; size?: number }): ReactNode {
  const p = props(size)

  switch (name) {
    case 'share':
      return (
        <svg {...p}>
          <path d="M12 15V4" />
          <path d="M8 8l4-4 4 4" />
          <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
        </svg>
      )
    case 'text':
      return (
        <svg {...p}>
          <Page />
          <path d="M8.5 13h7M8.5 16.5h4.5" />
        </svg>
      )
    case 'doc':
      return (
        <svg {...p}>
          <Page />
          {/* A W, for Word — the one export whose format is a product. */}
          <path d="M8 12.5l1.4 4 1.6-3 1.6 3 1.4-4" />
        </svg>
      )
    case 'pdf':
      /* A printer, and deliberately not a page like the two above it.
       *
         Those three started as one outline differing only in the mark on the
         page, which was tidy and wrong: at 18px inside a chip the PDF mark
         read as an empty box rather than as anything. And the odd one out is
         the honest answer anyway — .txt and .docx write a file, PDF hands you
         to the system print dialog, which is what its hint says and what the
         glyph should prepare you for. */
      return (
        <svg {...p}>
          <path d="M7 8V4h10v4" />
          <path d="M7 17H6a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1" />
          <rect x="7" y="14" width="10" height="6" rx="1" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...p}>
          <path d="M4 7h16" />
          <path d="M10 4h4M9 7v12M15 7v12" />
          <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
        </svg>
      )
    case 'undo':
      return (
        <svg {...p}>
          <path d="M4 9h11a5 5 0 0 1 0 10h-6" />
          <path d="M8 5 4 9l4 4" />
        </svg>
      )
    case 'cloud':
      return (
        <svg {...p}>
          <path d="M7 18h10a4 4 0 0 0 .5-7.97 6 6 0 0 0-11.4-1.2A3.5 3.5 0 0 0 7 18Z" />
        </svg>
      )
    case 'device':
      return (
        <svg {...p}>
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M11 18h2" />
        </svg>
      )
  }
}
