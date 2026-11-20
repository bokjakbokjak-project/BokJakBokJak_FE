import { isExperienceMode } from '../../lib/experience/mode'
import { useExperienceSession } from '../../lib/experience/session'

/**
 * What the experience mode's results are (요청서 3, data rules 2-4): the survey result is the
 * participant's own answers (or example answers after a skip), and every candidate, rate and
 * analysis is an example, not calculated from those answers.
 */
export default function ExperienceNotice({
  kind,
  className = '',
}: {
  kind: 'result' | 'candidates'
  className?: string
}) {
  const session = useExperienceSession()
  if (!isExperienceMode()) return null
  const text =
    kind === 'result'
      ? session?.surveySkipped
        ? '체험 모드예요. 설문을 건너뛰어 예시 답변으로 채웠어요.'
        : '체험 모드예요. 답변은 이 기기에만 있고 서버에 저장되지 않아요.'
      : '예시 후보와 매칭률이에요. 내 답변으로 계산한 추천이 아니에요.'
  return (
    <p
      role="note"
      className={`rounded-[10px] bg-white/85 px-3 py-2 text-center text-[12px] leading-[1.5] font-medium break-keep text-gray-500 ${className}`}
    >
      {text}
    </p>
  )
}
