import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import ProfileAnswerSections from '../../components/AnswerCard/ProfileAnswerSections'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommatePage from '../../components/roommate/RoommatePage'
import RoommateSheet from '../../components/roommate/RoommateSheet'
import { getAnswerSummary } from '../../lib/answerSummary'
import { HOME_ROUTES } from '../../lib/home/routes'
import { FROM_MY_STATE } from '../../lib/my/routes'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { readSharedProfile } from '../../lib/share/profileShare'
import {
  rememberShareReturn,
  takeShareReturn,
} from '../../lib/share/shareReturn'
import { useSharedViewer } from '../../lib/share/sharedViewer'
import { QUESTION_ROUTES } from '../question/questionData'

/**
 * The survey result opened from a share link (QA 15, Figma 1952:39744). It has no header, no age
 * and may show a match rate. A popup points to 복작복작 on arrival. The answers use the detail profile
 * sections (Figma 2339:26489): the person's own answers in full, and of the wanted roommate only
 * the first row, the rest blurred under a link to 복작복작.
 */
export default function SharedProfilePage() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const profile = readSharedProfile(hash)
  const { viewer, score, retry } = useSharedViewer(profile?.userId)
  const [isPromptOpen, setIsPromptOpen] = useState(true)
  const pageRef = useRef<HTMLDivElement>(null)

  // The sharer sees their own profile where the my page shows it (requested 2026-11-20).
  useEffect(() => {
    if (viewer.kind === 'self') {
      navigate(QUESTION_ROUTES.profile, { replace: true, state: FROM_MY_STATE })
    }
  }, [viewer.kind, navigate])

  /**
   * `복작복작으로 이동`: whatever the viewer still needs before the rows open, keeping this link
   * so they come back to it. A signed-out visitor signs in; the sign-in returns here when the
   * survey is done, or the survey result offers the way back once it is.
   */
  const continueToApp = () => {
    if (viewer.kind === 'checking') return
    if (viewer.kind === 'error') {
      retry()
      return
    }
    if (profile) rememberShareReturn(hash)
    if (viewer.kind === 'needs-survey') navigate(viewer.route)
    else navigate(ONBOARDING_ROUTES.login)
  }

  /** `홈화면으로 가기`: the app without coming back here. */
  const goHome = () => {
    // Leaving on purpose: a link kept earlier must not bring the visitor back after a sign-in.
    takeShareReturn()
    if (viewer.kind === 'member') navigate(HOME_ROUTES.home)
    else if (viewer.kind === 'needs-survey') navigate(viewer.route)
    else navigate(ONBOARDING_ROUTES.login)
  }

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
          onClick={goHome}
        >
          복작복작으로 이동하기
        </button>
      </main>
    )
  }

  const prompt = `복작복작에서 설문조사하고\n${profile.name}님과의 매칭률을 확인해요!`
  const cards = getAnswerSummary(profile.answers)
  const isUnlocked = viewer.kind === 'member'
  const lock =
    viewer.kind === 'needs-survey'
      ? { text: '설문조사하고\n이어보기', button: '설문조사 하러 가기' }
      : viewer.kind === 'error'
        ? { text: '상태를 확인하지\n못했어요', button: '다시 시도' }
        : viewer.kind === 'checking'
          ? {
              text: '복작복작에서\n설문조사하고 이어보기',
              button: '확인하는 중…',
            }
          : {
              text: '복작복작에서\n설문조사하고 이어보기',
              button: '복작복작으로 이동',
            }

  return (
    <RoommatePage
      footer={
        <div className="relative z-20 shrink-0 bg-brand-cream1 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[390px] px-6">
            <button
              type="button"
              onClick={goHome}
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
            matchRate: score.status === 'ready' ? score.rate : null,
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
        {score.status === 'failed' && (
          <p role="alert" className="px-6 text-center text-gray-500">
            매칭률을 불러올 수 없어요. 잠시 후 다시 시도해주세요.
          </p>
        )}
        <RoommateSheet scrolls={false}>
          <div className="mx-auto w-full max-w-[390px] px-6 pt-6 pb-[35px]">
            <ProfileAnswerSections
              cards={cards}
              // A member sees every row; anyone else sees the first and a way in.
              locked={
                isUnlocked ? undefined : (
                  // Figma 2339:26682, 37px under the top of the blurred rows.
                  <div className="sticky top-[47px] mx-auto mt-[37px] flex w-[190px] flex-col items-center gap-2.5">
                    <p className="text-center text-[20px] leading-[1.4] font-bold tracking-[-0.4px] whitespace-pre-line text-brand-brown3">
                      {lock.text}
                    </p>
                    <button
                      type="button"
                      disabled={viewer.kind === 'checking'}
                      aria-busy={viewer.kind === 'checking' || undefined}
                      className="h-[42px] min-w-[152px] rounded-full bg-brand-brown1 px-5 text-[16px] leading-[1.4] font-bold tracking-[-0.32px] text-white disabled:opacity-70"
                      onClick={continueToApp}
                    >
                      {lock.button}
                    </button>
                  </div>
                )
              }
            />
          </div>
        </RoommateSheet>
      </div>
      {isPromptOpen &&
        (viewer.kind === 'guest' || viewer.kind === 'needs-survey') && (
          // Figma 1952:40072, shown when the link opens to someone who cannot see it all yet.
          <ChoiceDialog
            title={prompt}
            closeLabel="닫기"
            confirmLabel={
              viewer.kind === 'needs-survey'
                ? '설문조사 하러 가기'
                : '복작복작으로 이동하기'
            }
            triggerRef={pageRef}
            onCancel={() => setIsPromptOpen(false)}
            onConfirm={continueToApp}
          />
        )}
    </RoommatePage>
  )
}
