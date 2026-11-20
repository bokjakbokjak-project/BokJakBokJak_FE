import { useId, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import closeIcon from '../../assets/share/close-x.svg'
import kakaoSymbol from '../../assets/share/kakao-symbol.svg'
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
  /**
   * `kakao` turns the brown button into KakaoTalk's yellow button with its speech bubble, for
   * sending to KakaoTalk (requested 2026-11-20, not in Figma). The colors follow Kakao's design
   * guide for its buttons: #FEE500 with 85% black.
   */
  confirmTone?: 'brown' | 'kakao'
  triggerRef: RefObject<HTMLElement | null>
  onCancel: () => void
  onConfirm: () => void
  /** Disables the brown button, such as while its request is out. Off by default. */
  confirmDisabled?: boolean
  /** Moves the box down from the frame's center, as the chat request dialog does (Figma 1686:17718). */
  offsetClass?: string
  /** Lets the box grow past 196px for a longer message (not in Figma). */
  autoHeight?: boolean
  /** Centers the title and the message, for a short notice (not in Figma). */
  centered?: boolean
}

const BUTTON_CLASS =
  'flex h-[42px] shrink-0 items-center justify-center text-[16px] leading-[1.5] font-semibold'

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
  confirmTone = 'brown',
  triggerRef,
  onCancel,
  onConfirm,
  confirmDisabled = false,
  offsetClass = '',
  autoHeight = false,
  centered = false,
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
          className={`relative flex ${autoHeight ? 'min-h-[196px]' : 'h-[196px]'} w-[285px] max-w-[calc(100%-32px)] flex-col gap-9 rounded-[12px] border-2 border-brand-brown3 bg-brand-cream1 px-[23px] pt-[25px] pb-[18px] shadow-[0_4px_25px_0_rgba(0,0,0,0.25)] outline-none ${offsetClass}`}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancel()
          }}
        >
          {closeLabel && (
            <button
              type="button"
              aria-label={closeLabel}
              // The circle shows on hover and keyboard focus only (requested 2026-11-20).
              className="absolute top-[14px] right-[14px] size-7 rounded-full border-[1.5px] border-transparent p-[0.36px] transition-colors hover:border-brand-brown3 hover:bg-brand-beige1 focus-visible:border-brand-brown3 focus-visible:bg-brand-beige1"
              onClick={onCancel}
            >
              <img src={closeIcon} alt="" className="size-6" />
            </button>
          )}
          <div
            className={`flex flex-col gap-0.5 leading-[1.5] ${centered ? 'text-center' : ''}`}
          >
            <h2
              id={titleId}
              className={`text-[18px] font-semibold tracking-[-0.36px] break-keep whitespace-pre-line text-brand-brown1 ${closeLabel ? 'pr-8' : ''}`}
            >
              {title}
            </h2>
            {message && (
              <p
                id={messageId}
                className="text-[14px] tracking-[-0.28px] break-keep whitespace-pre-line text-gray-400 [overflow-wrap:anywhere]"
              >
                {message}
              </p>
            )}
          </div>
          <div className="mt-auto flex gap-1.5">
            {cancelLabel && (
              <button
                type="button"
                className={`${BUTTON_CLASS} w-[116px] rounded-full border border-brand-cream3 bg-brand-cream2 text-brand-brown1`}
                onClick={onCancel}
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              disabled={confirmDisabled}
              className={`${BUTTON_CLASS} ${cancelLabel ? 'w-[116px]' : 'w-full'} ${
                confirmTone === 'kakao'
                  ? 'gap-2 rounded-[12px] bg-[#FEE500] text-[rgba(0,0,0,0.85)]'
                  : 'rounded-full bg-brand-brown1 text-white'
              } disabled:opacity-60`}
              onClick={onConfirm}
            >
              {confirmTone === 'kakao' && (
                <img src={kakaoSymbol} alt="" className="size-[18px]" />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
