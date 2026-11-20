import { useRef, useState } from 'react'
import { isExperienceMode } from '../../lib/experience/mode'
import { useExperienceSession } from '../../lib/experience/session'
import ChoiceDialog from '../dialog/ChoiceDialog'

/**
 * What the experience mode's results are (요청서 3, data rules 2-4): the survey result is the
 * participant's own answers (or example answers after a skip), and every candidate, rate and
 * analysis is an example, not calculated from those answers.
 *
 * - `result`: a dialog when the survey result opens (requested 2026-11-20), not a line on top.
 * - `candidates`: a line over the list on a see-through pink, so it stands out.
 */
export default function ExperienceNotice({
  kind,
  className = '',
}: {
  kind: 'result' | 'candidates'
  className?: string
}) {
  if (!isExperienceMode()) return null
  return kind === 'result' ? (
    <ResultDialog />
  ) : (
    <p
      role="note"
      className={`rounded-[10px] bg-roommate-pink/85 px-3 py-2 text-center text-[12px] leading-[1.5] font-semibold text-balance break-keep text-brand-brown1 ${className}`}
    >
      예시 후보와 매칭률이에요. 내 답변으로 계산한 추천이 아니에요.
    </p>
  )
}

/** Once per participant and attempt, so coming back to the result does not ask again. */
const seenKey = (id: string, attempt: number) =>
  `bokjak-experience-result-notice:${id}:${attempt}`

function hasSeen(key: string) {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function ResultDialog() {
  const session = useExperienceSession()
  const key = session ? seenKey(session.id, session.attempt) : null
  const [isOpen, setIsOpen] = useState(() => (key ? !hasSeen(key) : true))
  const pageRef = useRef<HTMLElement>(null)
  if (!isOpen) return null
  const close = () => {
    setIsOpen(false)
    try {
      if (key) sessionStorage.setItem(key, '1')
    } catch {
      // Shown again next time; nothing else depends on it.
    }
  }
  return (
    <ChoiceDialog
      title="체험 모드예요"
      message={
        session?.surveySkipped
          ? '설문을 건너뛰어\n예시 답변으로 채웠어요.'
          : '답변은 이 기기에만 있고\n서버에 저장되지 않아요.'
      }
      confirmLabel="확인"
      centered
      triggerRef={pageRef}
      onCancel={close}
      onConfirm={close}
    />
  )
}
