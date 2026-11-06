import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import back from '../../assets/question/back.svg'
import profileScene from '../../assets/question/profile-scene.png'
import share from '../../assets/question/share.svg'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import {
  QUESTION_COUNT,
  QUESTION_ROUTES,
  QUESTION_TOPICS,
} from './questionData'
import { useQuestion } from './questionState'

// Card fills in Figma order. The labels beside the frame tie them to rank, but ranks do not
// reorder the topics yet (OPEN_QUESTIONS PL-5).
const CARD_COLORS = [
  'bg-brand-beige2',
  'bg-brand-beige3',
  'bg-brand-beige3',
  'bg-brand-beige3',
  'bg-gray-100',
  'bg-gray-50',
  'bg-gray-50',
  'bg-gray-50',
]

/** Figma 988:15484 and 988:15789. The sheet is a placeholder until share options are decided. */
function ShareSheet({ onClose }: { onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    sheetRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-x-0 top-[100px] bottom-0 z-20 flex justify-center"
      onClick={onClose}
    >
      <div className="relative w-full overflow-hidden bg-white/40 backdrop-blur-[4px]">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-label="공유하기"
          tabIndex={-1}
          className="absolute inset-x-0 bottom-0 h-[359px] bg-white pt-[127px] text-center text-[16px] text-gray-black outline-none"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose()
          }}
        >
          공유하기
        </div>
      </div>
    </div>
  )
}

export default function QuestionProfilePage() {
  const navigate = useNavigate()
  const { answers } = useQuestion()
  const { data } = useOnboarding()
  const [isSharing, setIsSharing] = useState(false)

  if (Object.keys(answers).length < QUESTION_COUNT) {
    return <Navigate to={QUESTION_ROUTES.survey} replace />
  }

  return (
    <div className="flex flex-1 flex-col bg-question-paper pt-[max(0px,calc(47px-env(safe-area-inset-top)))]">
      <header className="flex h-14 shrink-0 items-center justify-between pr-8 pl-[30px]">
        <button
          type="button"
          aria-label="뒤로"
          className="size-7"
          onClick={() => navigate(QUESTION_ROUTES.survey)}
        >
          <img src={back} alt="" className="-rotate-90" />
        </button>
        <button
          type="button"
          aria-label="공유하기"
          aria-expanded={isSharing}
          onClick={() => setIsSharing((current) => !current)}
        >
          <img src={share} alt="" />
        </button>
      </header>
      <main className="flex flex-col px-6">
        <img src={profileScene} alt="" className="w-full rounded-[6px]" />
        <div className="relative mt-4 h-[51px]">
          <h1 className="text-center text-[18px] leading-[1.5] font-medium text-black">
            <span className="font-semibold">
              {data.name.trim() || '사용자'}
            </span>
            님의 정보
          </h1>
          <ul className="absolute top-0.5 right-0 list-inside list-disc text-[14px] leading-[19px] text-gray-500">
            <li className="font-semibold text-brand-brown1">본인</li>
            <li className="font-medium">상대</li>
          </ul>
        </div>
        <ul className="flex flex-col gap-2.5">
          {QUESTION_TOPICS.map((topic, index) => (
            <li
              key={topic.id}
              className={`flex flex-col gap-2.5 rounded-[10px] px-2 pt-[13px] pb-4 text-[14px] leading-[17px] ${CARD_COLORS[index]}`}
            >
              <p className="font-semibold text-black">
                Q{index + 1}. {topic.self.text.replace('\n', ' ')}
              </p>
              <div className="flex flex-col gap-1">
                <p className="font-semibold text-brand-brown1">
                  {answers[index * 2]}
                </p>
                <p className="font-medium text-gray-500">
                  {answers[index * 2 + 1]}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </main>
      <div className="mt-[17px] h-[94px] shrink-0 bg-white px-6 pt-4 shadow-[0px_-1px_30px_0px_rgba(212,212,212,0.25)]">
        {/* There is no home screen yet, so this stays disabled (OPEN_QUESTIONS PL-6). */}
        <button
          type="button"
          disabled
          className="flex h-[54px] w-full items-center justify-center rounded-[10px] bg-brand-brown1 p-2.5 text-[13px] leading-[1.5] font-semibold text-question-paper"
        >
          홈화면으로 가기
        </button>
      </div>
      {isSharing && <ShareSheet onClose={() => setIsSharing(false)} />}
    </div>
  )
}
