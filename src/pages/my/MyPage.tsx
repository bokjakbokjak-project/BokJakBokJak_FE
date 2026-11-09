import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import menuChevron from '../../assets/my/menu-chevron.svg'
import pencil from '../../assets/my/pencil.svg'
import panelDecor from '../../assets/onboarding/panel-decor.svg'
import BottomNav from '../../components/BottomNav/BottomNav'
import { usePendingNotice } from '../../components/BottomNav/usePendingNotice'
import AnswerCard from '../../components/my/AnswerCard'
import ConfirmDialog from '../../components/my/ConfirmDialog'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHeader from '../../components/my/ProfileHeader'
import { DIAMOND_BACKGROUND } from '../../lib/diamondBackground'
import { HOME_ROUTES } from '../../lib/home/routes'
import { getAnswerSummary } from '../../lib/my/answerSummary'
import { FROM_MY_STATE, MY_ROUTES } from '../../lib/my/routes'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useQuestion } from '../question/questionState'

const MENU_ROW_CLASS =
  'flex w-full items-center justify-between bg-brand-cream1 px-4 py-[15px] text-left text-[16px] leading-[1.5] font-medium tracking-[-0.32px] text-brand-brown3'

/**
 * Figma 1532:20013 (first screen) and 1532:19717 (the whole page). The content above the bottom
 * bar scrolls; the bar stays fixed. The PC frame is always 844px tall.
 */
export default function MyPage() {
  const navigate = useNavigate()
  const { data, update } = useOnboarding()
  const { answers, reset } = useQuestion()
  const notice = usePendingNotice()
  const [isConfirming, setIsConfirming] = useState(false)
  const retakeButtonRef = useRef<HTMLButtonElement>(null)
  const name = data.name.trim() || '사용자'

  // Keeps the name, gender, birth year, school, and dormitory, so the onboarding guard lets the
  // user straight into the priority step. Only the priorities and the survey start over.
  const retakeSurvey = () => {
    update({ priorities: [] })
    reset()
    navigate(ONBOARDING_ROUTES.priority)
  }

  return (
    <div className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex h-dvh flex-col overflow-hidden bg-brand-cream1 md:h-[844px]">
      <div
        data-testid="my-scroll"
        className="scrollbar-none min-h-0 flex-1 overflow-x-clip overflow-y-auto"
      >
        <div
          className="flex min-h-full flex-col pt-[max(47px,env(safe-area-inset-top))]"
          style={DIAMOND_BACKGROUND}
        >
          {/* Replaces this entry, so the browser's back button does not return here. */}
          <ProfileHeader
            onBack={() => navigate(HOME_ROUTES.home, { replace: true })}
          />
          <main className="flex flex-1 flex-col">
            <div className="mt-[17.79px]">
              <ProfileAvatar priorities={data.priorities} />
            </div>
            <div className="relative mx-auto mt-[17.79px] max-w-[calc(100%-96px)]">
              <h2 className="text-center text-[20px] leading-[normal] font-bold tracking-[0.4px] break-all text-gray-500">
                {name}
              </h2>
              <Link
                to={MY_ROUTES.editName}
                state={FROM_MY_STATE}
                aria-label="닉네임 수정"
                className="absolute bottom-1 left-full ml-0.5 size-4 before:absolute before:-inset-2"
              >
                <img src={pencil} alt="" className="size-4" />
              </Link>
            </div>
            <div className="mx-6 mt-[33px] overflow-hidden rounded-[15px] border border-my-menu-border">
              <button
                type="button"
                className={MENU_ROW_CLASS}
                onClick={notice.show}
              >
                로그아웃 하기
                <img src={menuChevron} alt="" className="size-6" />
              </button>
              <button
                ref={retakeButtonRef}
                type="button"
                className={MENU_ROW_CLASS}
                onClick={() => setIsConfirming(true)}
              >
                설문조사 다시 하기
                <img src={menuChevron} alt="" className="size-6" />
              </button>
            </div>
            <section
              aria-labelledby="answer-summary-title"
              className="relative mt-[33px] flex-1 rounded-t-[35px] bg-brand-cream1 shadow-[0_0_0_2px_var(--color-brand-brown2)]"
            >
              <img
                src={panelDecor}
                alt=""
                className="absolute top-[15px] left-1/2 h-[27px] w-[116.003px] max-w-none -translate-x-1/2"
              />
              <div className="mx-auto w-full max-w-[390px] px-6 pt-[57px] pb-[44px]">
                <h2
                  id="answer-summary-title"
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
            </section>
          </main>
        </div>
      </div>
      <BottomNav active="my" notice={notice} />
      {isConfirming && (
        <ConfirmDialog
          message={'우선순위와 설문 답변을\n처음부터 다시 설정하시겠어요?'}
          confirmLabel="다시 하기"
          triggerRef={retakeButtonRef}
          onConfirm={retakeSurvey}
          onCancel={() => setIsConfirming(false)}
        />
      )}
    </div>
  )
}
