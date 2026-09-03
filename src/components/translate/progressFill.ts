import type { CSSProperties } from 'react'

/* How full a .model-progress-fill is, 0-1, handed to CSS as a custom property
   rather than as a width string.
 *
 * The bar is drawn at full width and squeezed with transform: scaleX(), so
 * progress costs a composited transform instead of a layout pass — see the
 * note on .model-progress-fill in translate.css. Its own file because both
 * TranslatePage and TranslationOutput draw one of these bars, and a component
 * file that also exports a helper breaks fast refresh. */
export const fill = (fraction: number) =>
  ({ '--p': Math.min(1, Math.max(0, fraction)) }) as CSSProperties
