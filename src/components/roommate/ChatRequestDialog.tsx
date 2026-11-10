import { useId, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../../lib/onboarding/useModalLayer'

type ChatRequestDialogProps = {
  triggerRef: RefObject<HTMLElement | null>
  /** `계속 둘러보기`: closes the dialog and stays on the profile. */
  onClose: () => void
  /** `대화창 이동`. */
  onOpenChat: () => void
}

const BUTTON_CLASS =
  'flex h-[42px] w-[116px] shrink-0 items-center justify-center rounded-full text-[16px] leading-[1.5] font-semibold'

/**
 * Figma 1686:17718 on the 0.75 dimmed layer 1686:17716. Portaled like the other dialogs, so it
 * repeats the PC frame size and zoom (docs/desktop-frame-scaling.md). The Figma box sits 10px
 * below the frame's center. Figma defines no Escape or outside click, so both act like
 * `계속 둘러보기`, as in `ConfirmDialog`.
 */
export default function ChatRequestDialog({
  triggerRef,
  onClose,
  onOpenChat,
}: ChatRequestDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const messageId = useId()

  useModalLayer({ overlayRef, contentRef, triggerRef })

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-30 flex justify-center md:items-center"
      onClick={onClose}
    >
      <div className="flex h-full w-full items-center justify-center bg-[rgba(18,18,18,0.75)] md:h-[844px] md:w-[390px] md:overflow-hidden md:rounded-[24px] md:[zoom:var(--frame-scale,1)]">
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={messageId}
          tabIndex={-1}
          className="mt-5 flex h-[196px] w-[285px] max-w-[calc(100%-32px)] flex-col gap-9 rounded-[12px] border-2 border-brand-brown3 bg-brand-cream1 px-[23px] pt-[25px] pb-[18px] shadow-[0_4px_25px_0_rgba(0,0,0,0.25)] outline-none"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose()
          }}
        >
          <div className="flex flex-col gap-0.5 leading-[1.5]">
            <h2
              id={titleId}
              className="text-[18px] font-semibold tracking-[-0.36px] text-brand-brown1"
            >
              대화 요청을 보냈어요!
            </h2>
            <p
              id={messageId}
              className="text-[14px] tracking-[-0.28px] whitespace-pre-line text-gray-400"
            >
              {
                '성공적으로 대화 요청을 보냈어요!\n룸메이트에게 답장이 올 때까지 기다려봐요'
              }
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={`${BUTTON_CLASS} border border-brand-cream3 bg-brand-cream2 text-brand-brown1`}
              onClick={onClose}
            >
              계속 둘러보기
            </button>
            <button
              type="button"
              className={`${BUTTON_CLASS} bg-brand-brown1 text-white`}
              onClick={onOpenChat}
            >
              대화창 이동
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
