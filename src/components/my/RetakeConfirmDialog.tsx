import type { RefObject } from 'react'
import ConfirmDialog from './ConfirmDialog'

/**
 * The confirmation before a survey retake, shared by the my page's 설문조사 다시 하기 and the
 * home's 내 설문 다시보기 (requested 2026-11-20).
 */
export default function RetakeConfirmDialog({
  triggerRef,
  onConfirm,
  onCancel,
  busy,
}: {
  triggerRef: RefObject<HTMLElement | null>
  onConfirm: () => void
  onCancel: () => void
  /** While the saved survey is read, or a survey save is still out. */
  busy: boolean
}) {
  return (
    <ConfirmDialog
      message={'우선순위와 설문 답변을\n다시 설정하시겠어요?'}
      // Saving a changed survey restarts the agenda talks of an ongoing chat, and the
      // messages stay (Notion 설문 제출·수정, 재설문 연동).
      detail={
        '이전 답변이 미리 채워져 있어요.\n답변이나 우선순위를 바꿔 저장하면\n진행 중인 대화의 안건 조율이 처음부터\n다시 시작돼요. 대화 내용은 그대로 남아요.'
      }
      confirmLabel="다시 하기"
      triggerRef={triggerRef}
      onConfirm={onConfirm}
      confirmDisabled={busy}
      onCancel={onCancel}
    />
  )
}
