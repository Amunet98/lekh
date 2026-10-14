import type { ToolId } from '../../lib/prefs'

/* The Tools tab's icons, in the same drawing as the section icons
 * (SectionIcons.tsx): a 24-unit box, 2-unit round stroke, no fill — Lucide's
 * grid, which is what the rest of the app's icons are drawn on. */

type IconName = ToolId | 'swap' | 'expand' | 'search' | 'refresh' | 'phone'

export function ToolIcon({ name, size = 20 }: { name: IconName; size?: number }) {
  const props = {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }

  switch (name) {
    case 'date':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      )
    case 'amount':
      // A receipt with lines of writing: an amount written out.
      return (
        <svg {...props}>
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
          <path d="M14 8H8M16 12H8M13 16H8" />
        </svg>
      )
    case 'currency':
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" />
          <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
          <path d="M7 6h1v4M16.71 13.88l.7.71-2.82 2.82" />
        </svg>
      )
    case 'preeti':
      return (
        <svg {...props}>
          <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1" />
          <path d="m22 22-5-10-5 10M14 18h6" />
        </svg>
      )
    case 'phrases':
      return (
        <svg {...props}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
          <path d="M13 8H7M17 12H7" />
        </svg>
      )
    case 'swap':
      return (
        <svg {...props}>
          <path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16" />
        </svg>
      )
    case 'expand':
      return (
        <svg {...props}>
          <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
      )
    case 'search':
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      )
    case 'refresh':
      return (
        <svg {...props}>
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...props}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
        </svg>
      )
  }
}
