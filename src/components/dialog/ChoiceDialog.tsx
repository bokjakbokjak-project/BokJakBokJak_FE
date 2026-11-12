import { useId, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import closeIcon from '../../assets/share/close-x.svg'
import { useModalLayer } from '../../lib/onboarding/useModalLayer'

type ChoiceDialogProps = {
  /** Line breaks are kept. */
  title: string
  /** Line breaks are kept. */
  message?: string
  /** Left, light button. Without it the brown button takes the whole row (Figma 1377:36531). */
  cancelLabel?: string
  /** Adds the round X of Figma 1952:40103. It, Escape and a click outside call `onCancel`. */
  closeLabel?: string
  /** Right, brown button. */
  confirmLabel: string
  triggerRef: RefObject<HTMLElement | null>
  onCancel: () => void
  onConfirm: () => void
  /** Moves the box down from the frame's center, as the chat request dialog does (Figma 1686:17718). */
  offsetClass?: string
}

const BUTTON_CLASS =
  'flex h-[42px] shrink-0 items-center justify-center rounded-full text-[16px] leading-[1.5] font-semibold'

/**
 * The 285×196 cream dialog with two round buttons on the 0.75 dimmed layer, shared by the chat
 * request (Figma 1686:17718) and the agenda confirmation (1715:38389). Portaled like the other
 * dialogs, so it repeats the PC frame size and zoom (docs/desktop-frame-scaling.md).
 */
export default function ChoiceDialog({
  title,
  message,
  cancelLabel,
  closeLabel,
  confirmLabel,
  triggerRef,
  onCancel,
  onConfirm,
  offsetClass = '',
}: ChoiceDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const messageId = useId()

  useModalLayer({ overlayRef, contentRef, triggerRef })

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-30 flex justify-center md:items-center"
      onClick={onCancel}
    >
      <div className="flex h-full w-full items-center justify-center bg-[rgba(18,18,18,0.75)] md:h-[844px] md:w-[390px] md:overflow-hidden md:rounded-[24px] md:[zoom:var(--frame-scale,1)]">
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={message ? messageId : undefined}
          tabIndex={-1}
          className={`relative flex h-[196px] w-[285px] max-w-[calc(100%-32px)] flex-col gap-9 rounded-[12px] border-2 border-brand-brown3 bg-brand-cream1 px-[23px] pt-[25px] pb-[18px] shadow-[0_4px_25px_0_rgba(0,0,0,0.25)] outline-none ${offsetClass}`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancel()
          }}
        >
          {closeLabel && (
            <button
              type="button"
              aria-label={closeLabel}
              className="absolute top-[14px] right-[14px] size-7 rounded-full border-[1.5px] border-brand-brown3 bg-brand-beige1 p-[0.36px]"
              onClick={onCancel}
            >
              <img src={closeIcon} alt="" className="size-6" />
            </button>
          )}
          <div className="flex flex-col gap-0.5 leading-[1.5]">
            <h2
              id={titleId}
              className={`text-[18px] font-semibold tracking-[-0.36px] break-keep whitespace-pre-line text-brand-brown1 ${closeLabel ? 'pr-8' : ''}`}
            >
              {title}
            </h2>
            {message && (
              <p
                id={messageId}
                className="text-[14px] tracking-[-0.28px] whitespace-pre-line text-gray-400"
              >
                {message}
              </p>
            )}
          </div>
          <div className="mt-auto flex gap-1.5">
            {cancelLabel && (
              <button
                type="button"
                className={`${BUTTON_CLASS} w-[116px] border border-brand-cream3 bg-brand-cream2 text-brand-brown1`}
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              className={`${BUTTON_CLASS} ${cancelLabel ? 'w-[116px]' : 'w-full'} bg-brand-brown1 text-white`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
