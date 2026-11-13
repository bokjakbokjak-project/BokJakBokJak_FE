import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import menuChevron from '../../assets/my/menu-chevron.svg'
import pencil from '../../assets/my/pencil.svg'
import BottomNav from '../../components/BottomNav/BottomNav'
import { usePendingNotice } from '../../components/BottomNav/usePendingNotice'
import ConfirmDialog from '../../components/my/ConfirmDialog'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHeader from '../../components/my/ProfileHeader'
import { isServerMode } from '../../lib/api/config'
import { useAuth } from '../../lib/auth/authState'
import { DIAMOND_BACKGROUND } from '../../lib/diamondBackground'
import { HOME_ROUTES } from '../../lib/home/routes'
import { FROM_MY_STATE, MY_ROUTES } from '../../lib/my/routes'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { QUESTION_ROUTES } from '../question/questionData'
import { useQuestion } from '../question/questionState'

const MENU_ROW_CLASS =
  'flex w-full items-center justify-between bg-brand-cream1 px-4 py-[15px] text-left text-[16px] leading-[1.5] font-medium tracking-[-0.32px] text-brand-brown3'

/**
 * Figma 1931:27101, which replaced 1532:20013: the centered character and name, then one list
 * of rows. The content above the bottom bar scrolls; the bar stays fixed. The PC frame is always
 * 844px tall. `상세 프로필 보기` is the last row and opens the detail profile screen
 * (`/question/profile`) with the answer summary; back returns here (requested 2026-11-13, in place
 * of the earlier fold-open summary).
 */
export default function MyPage() {
  const navigate = useNavigate()
  const { data, update } = useOnboarding()
  const { reset } = useQuestion()
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

  // Server mode only. Sample mode keeps the `아직 준비 중입니다.` notice (OPEN_QUESTIONS MY-1).
  // Signing out always ends the local session, even if the request fails.
  const { signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const handleLogout = async () => {
    setIsLoggingOut(true)
    if (await signOut()) navigate(ONBOARDING_ROUTES.login, { replace: true })
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
          {/* Figma 1931:27101: the character and name centered, then one list of three rows. */}
          <main className="flex flex-1 flex-col">
            {/* Figma 1931:27101 puts the 100px frame at y=135 and the name at y=250; the white
                stroke sits outside the frame, so the box starts 5.208px earlier. */}
            <div className="mt-[26.792px] flex flex-col items-center gap-[9.792px]">
              <ProfileAvatar
                priorities={data.priorities}
                frame="rounded-[35.208px] bg-card-avatar"
                strokeOutside
              />
              <div className="flex max-w-[calc(100%-48px)] items-center gap-px">
                <h2 className="text-center text-[20px] leading-[normal] font-bold tracking-[0.4px] break-all text-gray-500">
                  {name}
                </h2>
                <Link
                  to={MY_ROUTES.editName}
                  state={FROM_MY_STATE}
                  aria-label="닉네임 수정"
                  className="relative size-6 shrink-0 before:absolute before:-inset-2"
                >
                  <img src={pencil} alt="" className="size-6" />
                </Link>
              </div>
            </div>
            <div className="mx-6 mt-8 overflow-hidden rounded-[12px] border border-my-menu-border">
              <button
                type="button"
                className={MENU_ROW_CLASS}
                onClick={isServerMode() ? handleLogout : notice.show}
                disabled={isLoggingOut}
                aria-busy={isLoggingOut || undefined}
              >
                로그아웃 하기
                <img src={menuChevron} alt="" className="size-6" />
              </button>
              <div aria-hidden className="mx-4 h-0.5 bg-brand-beige1" />
              <button
                ref={retakeButtonRef}
                type="button"
                className={MENU_ROW_CLASS}
                onClick={() => setIsConfirming(true)}
              >
                설문조사 다시 하기
                <img src={menuChevron} alt="" className="size-6" />
              </button>
              <div aria-hidden className="mx-4 h-0.5 bg-brand-beige1" />
              <Link
                to={QUESTION_ROUTES.profile}
                state={FROM_MY_STATE}
                className={MENU_ROW_CLASS}
              >
                상세 프로필 보기
                <img src={menuChevron} alt="" className="size-6" />
              </Link>
            </div>
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
