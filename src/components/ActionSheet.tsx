import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useSheetDrag } from '../hooks/useSheetDrag'
import './SheetGrabber.css'
import './ActionSheet.css'

export interface ActionSheetOption {
  /** Stable key and the accessible name. */
  id: string
  label: string
  /** The second line, where the choice needs one. */
  hint?: string
  /* A leading glyph. Optional, and every sheet in the app now passes one,
     because a column of text-only rows is what made these read as a system
     menu rather than as part of this app — and because an icon is the half of
     a row that a child, or someone reading a second language, can use. */
  icon?: ReactNode
  /** Drawn as chosen. For a set of mutually exclusive values. */
  selected?: boolean
  /* The one the sheet exists to offer. Drawn as a filled control rather than
     a row, because a confirmation whose two answers look identical is a
     confirmation that has not been designed — "Download & enable" and "Not
     now" carried exactly the same weight before this. At most one per sheet;
     menus of equal choices (the language pickers, the download formats) pass
     none and are unaffected. */
  primary?: boolean
  /** Throws something away. Drawn in --danger, and last in the list. */
  danger?: boolean
  onSelect: () => void
}

interface ActionSheetProps {
  open: boolean
  onClose: () => void
  /** Names the list for assistive tech, and titles the sheet. */
  label: string
  /* Optional, because a sheet is not always a list — the date converter is a
     sheet of controls with no options at all. */
  options?: ActionSheetOption[]
  /**
   * How the options behave as a set. 'menu' is a list of things to do;
   * 'radio' is a list of values one of which is current — which is the
   * difference between menuitem and menuitemradio, and the only reason the
   * caller has to say.
   */
  kind?: 'menu' | 'radio'
  /** Anything to put above the options. */
  children?: ReactNode
  /* Drop the eyebrow. For content that already carries its own heading —
     `label` still names the dialog for assistive tech, it just is not drawn
     twice. */
  hideTitle?: boolean
}

function CheckIcon() {
  return (
    <svg
      className="action-sheet__check"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

/* A bottom sheet of choices, for a phone.
 *
 * The two menus in this app — Download's format list and Translate's language
 * pickers — were absolutely-positioned boxes anchored under their button.
 * That is a desktop menu, and on a phone it has all of a desktop menu's
 * problems and none of its reasons: it opens over the thing it acts on, it is
 * as narrow as the button that spawned it, it lands wherever that button
 * happens to be rather than under the thumb, and it is dismissed by a click
 * somewhere harmless rather than by any gesture. A sheet from the bottom edge
 * is what every one of these is on a phone.
 *
 * The pieces that make it feel like one already existed and are used as-is:
 * useSheetDrag for the drag/fling gesture and SheetGrabber.css for the
 * grabber. What is new here is only the frame.
 *
 * Deliberately NOT built by generalising CheatSheetPanel. That panel is
 * bimodal — a bottom sheet below 1024px and a desktop slide-over above it —
 * and it carries a lot of specific, hard-won behaviour around focus, the
 * on-screen keyboard and its own search field. Pulling a shared frame out of
 * it would put all of that at risk to save ~50 lines of CSS. The frame is the
 * cheap half; the gesture is the expensive half, and the gesture is shared.
 */
export function ActionSheet({
  open,
  onClose,
  label,
  options = [],
  kind = 'menu',
  children,
  hideTitle = false,
}: ActionSheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const drag = useSheetDrag(ref, innerRef, onClose)

  /* showModal(), and useLayoutEffect rather than useEffect — both for exactly
     the reasons CheatSheetPanel gives at length: the modal call buys the focus
     trap, the inert background, top-layer stacking over the app bar and the
     dock, and Escape-to-close; and running it after paint costs a whole extra
     frame before the sheet has even been told to open.

     Feature-checked because the build targets safari14 (see vite.config.ts)
     and <dialog> did not land until Safari 15.4. Calling showModal() where it
     does not exist throws out of an effect with no error boundary above it,
     which React answers by unmounting the tree — so the button would blank
     the app rather than fail to open a sheet. */
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof el.showModal !== 'function' || typeof el.close !== 'function') return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="action-sheet"
      aria-label={label}
      /* Fires for Escape, for a backdrop click and for a completed drag
         alike, so the parent's state can never drift out of sync with the
         element's own open flag. */
      onClose={() => {
        drag.reset()
        onClose()
      }}
      /* ::backdrop is not an event target, so a click on the dim lands on the
         <dialog> itself; anything inside the sheet stops at the sheet, which
         is why this tests currentTarget. */
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={innerRef}
        className={`action-sheet__inner${drag.isDragging ? ' action-sheet__inner--dragging' : ''}`}
        style={{ transform: `translateY(${drag.dragY}px)` }}
        onTransitionEnd={drag.handlePanelTransitionEnd}
      >
        <button
          type="button"
          className={`sheet-grabber${drag.isDragging ? ' sheet-grabber--dragging' : ''}`}
          aria-label="Close"
          onClick={drag.handleGrabberClick}
          onPointerDown={drag.handleGrabberPointerDown}
          onPointerMove={drag.handleGrabberPointerMove}
          onPointerUp={drag.handleGrabberPointerEnd}
          onPointerCancel={drag.handleGrabberPointerEnd}
        >
          <span className="sheet-grabber-bar" />
        </button>

        {!hideTitle && <p className="action-sheet__title">{label}</p>}
        {children}

        {options.length > 0 && (
        <div className="action-sheet__options" role={kind === 'radio' ? 'radiogroup' : 'menu'}>
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              role={kind === 'radio' ? 'menuitemradio' : 'menuitem'}
              {...(kind === 'radio' ? { 'aria-checked': !!option.selected } : {})}
              className={`action-sheet__option${option.selected ? ' action-sheet__option--selected' : ''}${option.danger ? ' action-sheet__option--danger' : ''}${option.primary ? ' action-sheet__option--primary' : ''}`}
              onClick={() => {
                /* Close first, then act. Some of these handlers open a
                   system dialog of their own — the print sheet, the Android
                   share sheet — and stacking one over a <dialog> that is
                   still in the top layer leaves the sheet visible behind it
                   and, on the WebView, sometimes under it. */
                onClose()
                option.onSelect()
              }}
            >
              {option.icon && <span className="action-sheet__icon">{option.icon}</span>}
              <span className="action-sheet__option-text">
                <span className="action-sheet__label">{option.label}</span>
                {option.hint && <span className="action-sheet__hint">{option.hint}</span>}
              </span>
              {/* The tick is what makes a radio list look like one. Before it,
                  the current language was marked by colour and weight alone,
                  which is a difference you can only see by comparing the rows
                  against each other. aria-checked already says it properly;
                  this is the same fact for everyone else. */}
              {option.selected && <CheckIcon />}
            </button>
          ))}
        </div>
        )}
      </div>
    </dialog>
  )
}
