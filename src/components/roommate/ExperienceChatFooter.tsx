import { useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { startExperienceChat } from '../../lib/experience/experienceChat'
import { EXPERIENCE_ROUTES } from '../../lib/experience/mode'
import { getCandidate } from '../../lib/roommate/roommateData'
import ChoiceDialog from '../dialog/ChoiceDialog'
import ChatRequestBar from './ChatRequestBar'

/** What the experience chat keeps of the candidate (a snapshot; ids never reach an API). */
export type ExperienceChatTarget = {
  name: string
  adjust: readonly string[]
  source: 'example' | 'real'
}

/**
 * `대화 요청하기` in the experience (요청서 5.4): no request is sent. It says the chat is with
 * an experience partner who answers by itself, then opens the experience chat about the
 * difference the analysis named.
 */
export default function ExperienceChatFooter({
  candidateId,
  target,
}: {
  candidateId: string
  /** The real analysis's candidate, or left out for a sample candidate (read from its data). */
  target?: ExperienceChatTarget
}) {
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const sample = getCandidate(candidateId)
  const resolved: ExperienceChatTarget = target ?? {
    name: sample?.name ?? '체험 상대',
    adjust: sample?.analysis.adjust ?? [],
    source: 'example',
  }

  return (
    <>
      <ChatRequestBar buttonRef={buttonRef} onRequest={() => setOpen(true)} />
      {open && (
        <ChoiceDialog
          title="대화방이 열렸어요!"
          message={
            '조율할 내용을 함께 확인해보세요.\n\n이후 대화는 자동으로 응답하는 체험 상대와 진행돼요. 실제 사용자에게 대화 요청이나 메시지가 전송되지 않아요.'
          }
          cancelLabel="닫기"
          confirmLabel="대화 시작하기"
          autoHeight
          triggerRef={buttonRef}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            startExperienceChat({ ...resolved, candidateId })
            navigate(EXPERIENCE_ROUTES.chat)
          }}
        />
      )}
    </>
  )
}
