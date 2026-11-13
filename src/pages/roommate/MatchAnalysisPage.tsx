import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import iconAdjust from '../../assets/roommate/analysis-adjust.png'
import iconCheck from '../../assets/roommate/analysis-check.png'
import iconGood from '../../assets/roommate/analysis-good.png'
import { ErrorState, LoadingState } from '../../components/LoadState/LoadState'
import ChatRequestFooter from '../../components/roommate/ChatRequestFooter'
import { candidateCard } from '../../components/roommate/candidateCard'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommateHeader from '../../components/roommate/RoommateHeader'
import RoommatePage from '../../components/roommate/RoommatePage'
import RoommateSheet from '../../components/roommate/RoommateSheet'
import { serverProfileCard } from '../../components/roommate/serverProfileCard'
import { isServerMode } from '../../lib/api/config'
import { errorCode } from '../../lib/api/errorText'
import { parseId } from '../../lib/api/parse'
import { getChatReturnPath } from '../../lib/chat/routes'
import {
  getMatchAnalysis,
  type MatchAnalysis as ServerAnalysis,
} from '../../lib/roommate/recommendationApi'
import {
  getCandidate,
  type MatchAnalysis,
} from '../../lib/roommate/roommateData'
import { useRoommate } from '../../lib/roommate/roommateState'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

// Icon crops come from the Figma image fills (1057:14785, 1057:14790, 1057:14796).
const CATEGORIES = [
  {
    key: 'good',
    title: '이런 점이 잘 맞아요',
    icon: iconGood,
    crop: 'top-[-35.71%] left-[-35.71%] size-[171.43%]',
    gap: 'gap-[3px]',
  },
  {
    key: 'adjust',
    title: '이런 점은 조율해봐요',
    icon: iconAdjust,
    crop: 'top-[-29.47%] left-[-29.47%] size-[158.95%]',
    gap: 'gap-[3px]',
  },
  {
    key: 'check',
    title: '아직 확인이 필요해요',
    icon: iconCheck,
    crop: 'top-[-29.37%] left-[-29.37%] size-[158.73%]',
    gap: 'gap-0.5',
  },
] as const

/** The three result sections. An empty one is left out (채희 spec 7.3). */
function AnalysisSections({
  name,
  analysis,
}: {
  name: string
  analysis: MatchAnalysis
}) {
  return (
    <div className="relative mx-auto w-full max-w-[390px] px-6 pt-[15px] pb-[17.5px]">
      <h2 className="relative -left-[5.5px] text-center text-[20px] leading-[1.5] font-bold tracking-[-0.4px] text-gray-500">
        {name}님과의 나의 매칭결과
      </h2>
      <ul className="mt-[21px] flex flex-col gap-2.5">
        {CATEGORIES.map(({ key, title, icon, crop, gap }) => {
          const lines = analysis[key]
          if (lines.length === 0) return null
          return (
            <li
              key={key}
              className="flex min-h-[87.5px] flex-col gap-2 rounded-[12px] border border-brand-cream3 bg-brand-cream2 px-4 pt-4 pb-[13px] text-gray-500"
            >
              <h3
                className={`flex items-center text-[16px] leading-[1.5] font-bold ${gap}`}
              >
                <span className="relative size-[26px] shrink-0 overflow-hidden">
                  <img
                    src={icon}
                    alt=""
                    className={`absolute max-w-none ${crop}`}
                  />
                </span>
                {title}
              </h3>
              <div className="text-[14px] leading-[1.5] font-medium">
                {lines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The `상세프로필 보기` tab behind the card. */
function ProfileTab({ to, state }: { to: string; state: unknown }) {
  return (
    <Link
      to={to}
      state={state}
      className="absolute top-[188.58px] left-[38px] flex w-[161px] items-center justify-center rounded-b-[15px] bg-brand-brown3 px-2.5 pt-[35px] pb-2.5 text-[16px] leading-[1.5] font-semibold whitespace-nowrap text-white"
    >
      상세프로필 보기 →
    </Link>
  )
}

type Loaded =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; analysis: ServerAnalysis }

/**
 * Server mode: `GET /api/recommendations/{user_id}/analysis`. A new analysis can take a few
 * seconds while the AI writes it, so the screen says it is loading (채희 spec 7.3).
 */
function ServerMatchAnalysis({ userId }: { userId: number }) {
  const { state } = useLocation()
  const chatReturnPath = getChatReturnPath(state)
  const { loadRecommendations } = useRoommate()
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ attempt: number; value: Loaded }>()

  useEffect(() => {
    const controller = new AbortController()
    getMatchAnalysis(userId, controller.signal).then(
      (analysis) =>
        setLoaded({ attempt, value: { status: 'ready', analysis } }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setLoaded({ attempt, value: { status: 'error', error } })
        // The candidate left, so the list must not offer them any more (채희 spec 5).
        if (errorCode(error) === 'TARGET_WITHDRAWN') loadRecommendations(true)
      },
    )
    return () => controller.abort()
  }, [userId, attempt, loadRecommendations])

  const current: Loaded =
    loaded?.attempt === attempt ? loaded.value : { status: 'loading' }
  const id = String(userId)
  const header = (
    <RoommateHeader
      backTo={chatReturnPath ?? ROOMMATE_ROUTES.list}
      title="룸메이트"
    />
  )

  if (current.status !== 'ready') {
    return (
      <RoommatePage>
        {header}
        <div className="mx-auto w-full max-w-[390px] px-6">
          {current.status === 'loading' ? (
            <LoadingState label="AI가 두 분의 매칭 결과를 분석하고 있어요" />
          ) : (
            <ErrorState
              error={current.error}
              onRetry={
                errorCode(current.error) === 'TARGET_WITHDRAWN'
                  ? undefined
                  : () => setAttempt((count) => count + 1)
              }
            />
          )}
        </div>
      </RoommatePage>
    )
  }

  const { analysis } = current
  return (
    <RoommatePage
      footer={
        <ChatRequestFooter
          candidateId={id}
          onChanged={() => loadRecommendations(true)}
        />
      }
    >
      {header}
      <ProfileHero
        profile={serverProfileCard(analysis.target, analysis.matchScore)}
      >
        <ProfileTab
          to={ROOMMATE_ROUTES.profile(id)}
          state={chatReturnPath ? state : undefined}
        />
      </ProfileHero>
      <RoommateSheet>
        <AnalysisSections name={analysis.target.nickname} analysis={analysis} />
      </RoommateSheet>
    </RoommatePage>
  )
}

function SampleMatchAnalysis({ candidateId }: { candidateId?: string }) {
  const { state } = useLocation()
  const candidate = getCandidate(candidateId)
  // Opened from a chat room's profile picture, back returns to that room.
  const chatReturnPath = getChatReturnPath(state)

  if (!candidate) {
    return <Navigate to={ROOMMATE_ROUTES.list} replace />
  }

  return (
    <RoommatePage footer={<ChatRequestFooter candidateId={candidate.id} />}>
      <RoommateHeader
        backTo={chatReturnPath ?? ROOMMATE_ROUTES.list}
        title="룸메이트"
      />
      <ProfileHero profile={candidateCard(candidate)}>
        <ProfileTab
          to={ROOMMATE_ROUTES.profile(candidate.id)}
          state={chatReturnPath ? state : undefined}
        />
      </ProfileHero>
      <RoommateSheet>
        <AnalysisSections
          name={candidate.givenName}
          analysis={candidate.analysis}
        />
      </RoommateSheet>
    </RoommatePage>
  )
}

export default function MatchAnalysisPage() {
  const { candidateId } = useParams()
  if (!isServerMode()) return <SampleMatchAnalysis candidateId={candidateId} />
  const userId = parseId(candidateId)
  if (userId === null) return <Navigate to={ROOMMATE_ROUTES.list} replace />
  return <ServerMatchAnalysis key={userId} userId={userId} />
}
