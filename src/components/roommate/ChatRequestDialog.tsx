import type { RefObject } from 'react'
import ChoiceDialog from '../dialog/ChoiceDialog'

type ChatRequestDialogProps = {
  triggerRef: RefObject<HTMLElement | null>
  /** `계속 둘러보기`: closes the dialog and stays on the profile. */
  onClose: () => void
  /** `대화창 이동`. */
  onOpenChat: () => void
}

/**
 * Figma 1686:17718 on the 0.75 dimmed layer 1686:17716. The Figma box sits 10px below the frame's
 * center. Figma defines no Escape or outside click, so both act like `계속 둘러보기`, as in
 * `ConfirmDialog`.
 */
export default function ChatRequestDialog({
  triggerRef,
  onClose,
  onOpenChat,
}: ChatRequestDialogProps) {
  return (
    <ChoiceDialog
      title="대화 요청을 보냈어요!"
      message={
        '성공적으로 대화 요청을 보냈어요!\n룸메이트에게 답장이 올 때까지 기다려봐요'
      }
      cancelLabel="계속 둘러보기"
      confirmLabel="대화창 이동"
      triggerRef={triggerRef}
      onCancel={onClose}
      onConfirm={onOpenChat}
      offsetClass="mt-5"
    />
  )
}
