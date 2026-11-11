import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import share from '../../assets/question/share-small.svg'
import AnswerCard from '../../components/AnswerCard/AnswerCard'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommateHeader from '../../components/roommate/RoommateHeader'
import RoommatePage from '../../components/roommate/RoommatePage'
import RoommateSheet from '../../components/roommate/RoommateSheet'
import { getAnswerSummary } from '../../lib/answerSummary'
import { HOME_ROUTES, isFromHome } from '../../lib/home/routes'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { QUESTION_COUNT, QUESTION_ROUTES } from './questionData'
import { useQuestion } from './questionState'

/** Figma 988:15484 and 988:15789. The sheet is a placeholder until share options are decided. */
function ShareSheet({ onClose }: { onClose: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    sheetRef.current?.focus()
  }, [])

  return (
    <div
      className="fixed inset-x-0 top-[100px] bottom-0 z-30 flex justify-center"
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

/**
 * Age from the birth year chosen in onboarding, counted as this year minus the birth year. The
 * rule is not agreed (OPEN_QUESTIONS DE-12).
 */
function ageOf(birthYear: number | null) {
  return birthYear === null ? null : new Date().getFullYear() - birthYear
}

/**
 * The user's own character in the 100px card slot. `ProfileAvatar` draws its white outline inside
 * a 110.4px box, so it starts 5.2px outside the slot, and shrinks with the 84px slot on narrow
 * screens.
 */
function MyCardAvatar({
  priorities,
}: {
  priorities: Parameters<typeof ProfileAvatar>[0]['priorities']
}) {
  return (
    <span className="absolute -top-[5.208px] -left-[5.208px] origin-[5.208px_5.208px] scale-[0.84] min-[390px]:scale-100">
      <ProfileAvatar
        priorities={priorities}
        frame="rounded-[12.5px] bg-card-avatar"
      />
    </span>
  )
}

/**
 * Survey result, Figma 1377:35804. It shows the user's own card and answers in the layout of the
 * roommate detail profile. The card has no match rate, and only the answers scroll.
 */
export default function QuestionProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { answers } = useQuestion()
  const { data } = useOnboarding()
  const [isSharing, setIsSharing] = useState(false)

  if (Object.keys(answers).length < QUESTION_COUNT) {
    return <Navigate to={QUESTION_ROUTES.survey} replace />
  }

  return (
    <RoommatePage
      footer={
        <div className="relative z-20 shrink-0 bg-brand-cream1 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[390px] px-6">
            <button
              type="button"
              onClick={() => navigate(HOME_ROUTES.home)}
              className="flex h-[62px] w-full items-center justify-center rounded-[10px] bg-brand-brown1 p-2.5 text-[20px] leading-[1.5] font-semibold text-white"
            >
              홈화면으로 가기
            </button>
          </div>
        </div>
      }
    >
      <RoommateHeader
        backTo={
          isFromHome(location.state) ? HOME_ROUTES.home : QUESTION_ROUTES.survey
        }
        title="상세 프로필"
        action={
          <button
            type="button"
            aria-label="공유하기"
            aria-expanded={isSharing}
            className="size-7 rounded-full border-[1.5px] border-transparent transition-colors hover:border-brand-brown3 hover:bg-brand-beige1 focus-visible:border-brand-brown3 focus-visible:bg-brand-beige1"
            onClick={() => setIsSharing((current) => !current)}
          >
            <img src={share} alt="" className="-m-[1.5px] block size-7" />
          </button>
        }
      />
      <ProfileHero
        offset={9}
        profile={{
          name: data.name.trim() || '사용자',
          age: ageOf(data.birthYear),
          department: data.department,
          avatar: <MyCardAvatar priorities={data.priorities} />,
        }}
      />
      <RoommateSheet labelledBy="result-summary-title">
        <div className="mx-auto w-full max-w-[390px] px-6 pt-[15px] pb-[35px]">
          <h2
            id="result-summary-title"
            className="text-center text-[20px] leading-[1.5] font-bold tracking-[-0.4px] text-gray-500"
          >
            상세 답변 요약
          </h2>
          <div className="mt-[15px] flex flex-col gap-3">
            {getAnswerSummary(answers).map((card) => (
              <AnswerCard key={card.category} card={card} />
            ))}
          </div>
        </div>
      </RoommateSheet>
      {isSharing && <ShareSheet onClose={() => setIsSharing(false)} />}
    </RoommatePage>
  )
}
