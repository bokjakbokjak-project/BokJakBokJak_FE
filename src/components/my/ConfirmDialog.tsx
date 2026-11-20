import { useId, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../../lib/onboarding/useModalLayer'

type ConfirmDialogProps = {
  message: string
  /** Smaller gray lines under the message, such as what the action changes. Line breaks are kept. */
  detail?: string
  confirmLabel: string
  triggerRef: RefObject<HTMLElement | null>
  onConfirm: () => void
  onCancel: () => void
  /** Disables the confirm button while its work runs. Off by default. */
  confirmDisabled?: boolean
}

const BUTTON_CLASS =
  'flex h-12 min-w-0 flex-1 items-center justify-center rounded-[10px] text-[16px] leading-[1.5] font-semibold'

/**
 * Figma has no confirm dialog, so this reuses the overlay and colors of the mission notice. It is
 * portaled like that notice, so it repeats the PC frame size and zoom (docs/desktop-frame-scaling.md).
 */
export default function ConfirmDialog({
  message,
  detail,
  confirmLabel,
  triggerRef,
  onConfirm,
  onCancel,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const messageId = useId()
  const detailId = useId()

  useModalLayer({ overlayRef, contentRef, triggerRef })

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-30 flex justify-center md:items-center"
      onClick={onCancel}
    >
      <div className="flex h-full w-full items-center justify-center bg-[rgba(18,18,18,0.5)] md:h-[844px] md:w-[390px] md:overflow-hidden md:rounded-[24px] md:[zoom:var(--frame-scale,1)]">
        <div
          ref={contentRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={messageId}
          aria-describedby={detail ? detailId : undefined}
          tabIndex={-1}
          className="w-[322px] max-w-[calc(100%-32px)] rounded-[15px] bg-white px-5 pt-7 pb-5 text-center outline-none"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onCancel()
          }}
        >
          <p
            id={messageId}
            className="text-[18px] leading-[1.4] font-bold tracking-[0.36px] break-keep whitespace-pre-line text-gray-500"
          >
            {message}
          </p>
          {detail && (
            <p
              id={detailId}
              className="mt-2 text-[14px] leading-[1.5] tracking-[-0.28px] break-keep whitespace-pre-line text-gray-400"
            >
              {detail}
            </p>
          )}
          <div className="mt-6 flex gap-1.5">
            <button
              type="button"
              className={`${BUTTON_CLASS} border-[1.5px] border-brand-brown1 text-brand-brown1`}
              onClick={onCancel}
            >
              취소
            </button>
            <button
              type="button"
              className={`${BUTTON_CLASS} bg-brand-brown1 text-white disabled:opacity-60`}
              disabled={confirmDisabled}
              aria-busy={confirmDisabled || undefined}
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
