import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import ProfileAnswerSections from '../../components/AnswerCard/ProfileAnswerSections'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommatePage from '../../components/roommate/RoommatePage'
import RoommateSheet from '../../components/roommate/RoommateSheet'
import { apiRequest } from '../../lib/api/apiClient'
import { isApiError } from '../../lib/api/apiError'
import { useAuth } from '../../lib/auth/authState'
import { fetchMyStatus } from '../../lib/auth/statusApi'
import { resolveStartRoute } from '../../lib/auth/startRoute'
import {
  rememberShareReturn,
  takeShareReturn,
} from '../../lib/share/shareReturn'
import { getAnswerSummary } from '../../lib/answerSummary'
import { HOME_ROUTES } from '../../lib/home/routes'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { readSharedProfile } from '../../lib/share/profileShare'

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
  const { status } = useAuth()
  const [isPromptOpen, setIsPromptOpen] = useState(true)
  const [surveyRequired, setSurveyRequired] = useState(false)
  const [matchRate, setMatchRate] = useState<number | null>(null)
  const [matchError, setMatchError] = useState<string | null>(null)
  const userId = profile?.userId
  useEffect(() => {
    let active = true
    if (status === 'restoring')
      return () => {
        active = false
      }
    if (status !== 'authenticated' || !userId)
      return () => {
        active = false
      }
    fetchMyStatus()
      .then((current) => {
        if (!active) return null
        if (current.nextStep !== 'HOME') {
          setSurveyRequired(true)
          return null
        }
        return apiRequest(`/api/share/${userId}/match-score`, {
          retried401: 'fail',
        })
      })
      .then((value) => {
        if (value === null) return
        if (!active) return
        const data = value as {
          target_user_id?: unknown
          match_score?: unknown
        } | null
        if (
          !data ||
          data.target_user_id !== userId ||
          typeof data.match_score !== 'number' ||
          !Number.isFinite(data.match_score) ||
          data.match_score < 0 ||
          data.match_score > 100
        )
          throw new Error('Invalid match score')
        setMatchRate(data.match_score)
      })
      .catch((error: unknown) => {
        if (!active) return
        if (
          isApiError(error) &&
          error.status === 409 &&
          error.code === 'SURVEY_REQUIRED'
        )
          setSurveyRequired(true)
        else
          setMatchError('매칭률을 불러올 수 없어요. 잠시 후 다시 시도해주세요.')
      })
    return () => {
      active = false
    }
  }, [status, userId])
  const pageRef = useRef<HTMLDivElement>(null)
  const goToApp = async () => {
    if (profile) rememberShareReturn(hash)
    if (status === 'authenticated') {
      const route = await resolveStartRoute()
      if (route) {
        if (route === HOME_ROUTES.home) takeShareReturn()
        navigate(route)
      } else
        setMatchError(
          '사용자 상태를 불러올 수 없어요. 잠시 후 다시 시도해주세요.',
        )
    } else navigate(ONBOARDING_ROUTES.login)
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
            matchRate,
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
        {matchError && (
          <p role="alert" className="px-6 text-center text-gray-500">
            {matchError}
          </p>
        )}
        <RoommateSheet scrolls={false}>
          <div className="mx-auto w-full max-w-[390px] px-6 pt-6 pb-[35px]">
            <ProfileAnswerSections
              cards={cards}
              locked={
                // Figma 2339:26682, 37px under the top of the blurred rows.
                <div className="sticky top-[47px] mx-auto mt-[37px] flex w-[174px] flex-col items-center gap-2.5">
                  <p className="text-center text-[20px] leading-[1.4] font-bold tracking-[-0.4px] whitespace-pre-line text-brand-brown3">
                    {'복작복작에서\n설문조사하고 이어보기'}
                  </p>
                  <button
                    type="button"
                    className="h-[42px] w-[152px] rounded-full bg-brand-brown1 text-[16px] leading-[1.4] font-bold tracking-[-0.32px] text-white"
                    onClick={goToApp}
                  >
                    복작복작으로 이동
                  </button>
                </div>
              }
            />
          </div>
        </RoommateSheet>
      </div>
      {isPromptOpen &&
        status !== 'restoring' &&
        (status !== 'authenticated' || !userId || surveyRequired) && (
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
    </RoommatePage>
  )
}
