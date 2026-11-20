import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import ProfileAnswerSections from '../../components/AnswerCard/ProfileAnswerSections'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommatePage from '../../components/roommate/RoommatePage'
import RoommateSheet from '../../components/roommate/RoommateSheet'
import { getAnswerSummary } from '../../lib/answerSummary'
import { useAuth } from '../../lib/auth/authState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useMyProfile } from '../../lib/profile/myProfile'
import { readSharedProfile } from '../../lib/share/profileShare'
import {
  isSharedReturnState,
  rememberShareReturn,
} from '../../lib/share/shareReturn'
import { isUserTestEnabled } from '../../lib/userTest/config'
import { USER_TEST_ROUTES } from '../../lib/userTest/routes'
import { QUESTION_ROUTES } from '../question/questionData'

/**
 * The survey result opened from a share link (QA 15, Figma 1952:39744). It has no header, no age
 * and no match rate. A popup points to 복작복작 on arrival. The answers use the detail profile
 * sections (Figma 2339:26489): the person's own answers in full, and of the wanted roommate only
 * the first row, the rest blurred under a link to 복작복작.
 */
export default function SharedProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { hash, pathname } = location
  const profile = readSharedProfile(hash)
  // Back from the login that 복작복작으로 이동 asked for: go on with it, without the arrival popup.
  const returned = isSharedReturnState(location.state) ? location.state : null
  const [isPromptOpen, setIsPromptOpen] = useState(returned === null)
  const pageRef = useRef<HTMLDivElement>(null)
  const continueRef = useRef<HTMLButtonElement>(null)
  const goToApp = () => navigate(ONBOARDING_ROUTES.login)

  // 복작복작으로 이동 over the blurred rows (requested 2026-11-20): a signed-in visitor with a
  // saved survey sees the rest, and anyone else is asked to take the survey. A signed-out visitor
  // signs in first and comes back here.
  const { status: authStatus } = useAuth()
  const isSignedIn = authStatus === 'authenticated'
  const [wantsMore, setWantsMore] = useState(returned !== null)
  const { state: myProfile, retry: retryMyProfile } = useMyProfile({
    enabled: wantsMore && isSignedIn,
  })
  const isUnlocked = wantsMore && isSignedIn && myProfile.status === 'ready'
  const isChecking =
    wantsMore &&
    (authStatus === 'restoring' ||
      (isSignedIn &&
        (myProfile.status === 'idle' || myProfile.status === 'loading')))
  const needsSurvey =
    wantsMore &&
    (authStatus === 'disabled' ||
      (isSignedIn && myProfile.status === 'survey-required'))
  const checkFailed = wantsMore && isSignedIn && myProfile.status === 'failed'

  const continueReading = () => {
    if (authStatus === 'unauthenticated') {
      rememberShareReturn(pathname + hash)
      navigate(ONBOARDING_ROUTES.login)
      return
    }
    setWantsMore(true)
  }
  // From the beginning: a new account starts with the onboarding, sample mode with the login,
  // and an account that finished the onboarding with the survey. The user test build starts at
  // its own start screen, which fills the test basic information.
  const startSurvey = () =>
    navigate(
      authStatus === 'disabled'
        ? ONBOARDING_ROUTES.login
        : isUserTestEnabled()
          ? USER_TEST_ROUTES.start
          : returned?.nextStep === 'ONBOARDING'
            ? ONBOARDING_ROUTES.school
            : QUESTION_ROUTES.survey,
    )

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-brand-cream1 px-6 text-center">
        <p className="text-[16px] leading-[1.5] font-medium text-gray-500">
          공유된 프로필을 열 수 없어요.
          <br />
          링크를 다시 확인해주세요.
        </p>
        <button
          type="button"
          className="h-[42px] rounded-full bg-brand-brown1 px-6 text-[16px] font-semibold text-white"
          onClick={goToApp}
        >
          복작복작으로 이동하기
        </button>
      </main>
    )
  }

  const prompt = `복작복작에서 설문조사하고\n${profile.name}님과의 매칭률을 확인해요!`
  const cards = getAnswerSummary(profile.answers)

  return (
    <RoommatePage
      footer={
        <div className="relative z-20 shrink-0 bg-brand-cream1 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[390px] px-6">
            <button
              type="button"
              onClick={goToApp}
              className="flex h-[62px] w-full items-center justify-center rounded-[10px] bg-brand-brown1 p-2.5 text-[20px] leading-[1.5] font-semibold text-white"
            >
              홈화면으로 가기
            </button>
          </div>
        </div>
      }
    >
      <div
        ref={pageRef}
        data-testid="shared-scroll"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {/* No header in Figma: the card block starts 43px under the status bar. */}
        <div className="h-[43px] shrink-0" />
        <ProfileHero
          profile={{
            name: profile.name,
            age: null,
            department: profile.department,
            matchRate: null,
            avatar: (
              <span className="absolute inset-0 origin-top-left scale-[0.84] min-[390px]:scale-100">
                <ProfileAvatar
                  priorities={profile.priorities}
                  frame="rounded-[12.5px] bg-card-avatar"
                />
              </span>
            ),
          }}
        />
        <RoommateSheet scrolls={false}>
          <div className="mx-auto w-full max-w-[390px] px-6 pt-6 pb-[35px]">
            <ProfileAnswerSections
              cards={cards}
              locked={
                isUnlocked ? undefined : (
                  // Figma 2339:26682, 37px under the top of the blurred rows.
                  <div className="sticky top-[47px] mx-auto mt-[37px] flex w-[174px] flex-col items-center gap-2.5">
                    <p className="text-center text-[20px] leading-[1.4] font-bold tracking-[-0.4px] whitespace-pre-line text-brand-brown3">
                      {'복작복작에서\n설문조사하고 이어보기'}
                    </p>
                    <button
                      ref={continueRef}
                      type="button"
                      disabled={isChecking}
                      aria-busy={isChecking || undefined}
                      className="h-[42px] w-[152px] rounded-full bg-brand-brown1 text-[16px] leading-[1.4] font-bold tracking-[-0.32px] text-white disabled:opacity-70"
                      onClick={continueReading}
                    >
                      {isChecking ? '확인하는 중…' : '복작복작으로 이동'}
                    </button>
                  </div>
                )
              }
            />
          </div>
        </RoommateSheet>
      </div>
      {isPromptOpen && (
        // Figma 1952:40072, shown when the link opens.
        <ChoiceDialog
          title={prompt}
          closeLabel="닫기"
          confirmLabel="복작복작으로 이동하기"
          triggerRef={pageRef}
          onCancel={() => setIsPromptOpen(false)}
          onConfirm={goToApp}
        />
      )}
      {needsSurvey && (
        <ChoiceDialog
          title={`설문조사를 해서\n${profile.name}님과의 매칭률을 확인해보세요`}
          closeLabel="닫기"
          confirmLabel="설문조사 하러 가기"
          triggerRef={continueRef}
          onCancel={() => setWantsMore(false)}
          onConfirm={startSurvey}
        />
      )}
      {checkFailed && (
        <ChoiceDialog
          title="내 설문 결과를 확인하지 못했어요"
          message="잠시 후 다시 시도해주세요."
          closeLabel="닫기"
          confirmLabel="다시 시도"
          triggerRef={continueRef}
          onCancel={() => setWantsMore(false)}
          onConfirm={retryMyProfile}
        />
      )}
    </RoommatePage>
  )
}
