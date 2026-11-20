import { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import RoomBackground from '../../components/onboarding/RoomBackground'
import { isExperienceMode } from '../../lib/experience/mode'
import {
  restartAttempt,
  startNewParticipant,
  updateExperienceSession,
  useExperienceSession,
  type ExperiencePurpose,
} from '../../lib/experience/session'
import { useExperienceSetup } from '../../lib/experience/useExperienceSetup'

const STEPS = [
  '생활에서 중요한 기준 3가지 고르기',
  '생활습관 설문 (예시 답변으로 건너뛸 수 있어요)',
  '예시 후보의 추천·매칭 분석 보기',
  '체험 상대와 조율 채팅, 최종 매칭',
]

/**
 * The experience start (`/experience`, 요청서 3, 4.3). No sign-in: the basic information is the
 * shared experience setting, and the participant goes straight to their own priorities. The
 * results are examples, and the screen says so before it starts.
 */
export default function ExperienceStartPage() {
  const session = useExperienceSession()
  const { begin } = useExperienceSetup()
  const [params] = useSearchParams()
  const linkPurpose: ExperiencePurpose =
    params.get('purpose') === 'film' ? 'film' : 'booth'

  // The first visit in this browser opens a participant session; `?purpose=film` sets up the
  // filming run (scene jumps in the presenter menu, two agendas).
  useEffect(() => {
    if (!isExperienceMode()) return
    if (!session) startNewParticipant(linkPurpose)
    else if (params.has('purpose') && session.purpose !== linkPurpose) {
      updateExperienceSession((current) => ({
        ...current,
        purpose: linkPurpose,
      }))
    }
  }, [session, linkPurpose, params])

  if (!isExperienceMode()) return <Navigate to="/" replace />

  const start = () => {
    // A finished or half-done run of this participant starts over as a new attempt.
    if (session && (session.chat || session.matched || session.surveySkipped)) {
      restartAttempt()
    }
    begin()
  }

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-brand-cream1 pt-[max(47px,env(safe-area-inset-top))] md:rounded-[24px]">
      <RoomBackground className="absolute inset-x-0 bottom-0 -z-10 h-[439px]" />
      <main className="flex flex-1 flex-col px-6 pt-8">
        <p className="text-[13px] leading-[1.5] font-semibold text-brand-brown3">
          핵심 체험
        </p>
        <h1 className="mt-1 text-[22px] leading-[1.5] font-bold tracking-[0.44px] break-keep text-brand-brown1">
          로그인 없이 복작복작을
          <br />
          처음부터 끝까지 체험해 보세요
        </h1>
        <ol className="mt-5 flex flex-col gap-2">
          {STEPS.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-2.5 rounded-[12px] border border-brand-cream3 bg-brand-cream2 px-4 py-3 text-[14px] leading-[1.5] font-medium break-keep text-gray-500"
            >
              <span className="font-bold text-brand-brown3">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-[10px] bg-white/90 px-3 py-2 text-[12px] leading-[1.5] font-medium break-keep text-gray-500">
          추천 후보와 매칭률, 분석은 예시예요. 기본 정보는 체험용 공통값을 써요.
          입력한 내용은 이 기기에만 남고 서버로 보내지 않아요.
        </p>
      </main>
      <div className="px-6 pb-[max(28px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={start}
          className="flex h-[62px] w-full items-center justify-center rounded-[10px] bg-brand-brown1 text-[20px] leading-[1.5] font-semibold text-white"
        >
          체험 시작하기
        </button>
      </div>
    </div>
  )
}
