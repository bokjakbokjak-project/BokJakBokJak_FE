import { useEffect, useState } from 'react'
import { Navigate, useLocation, useParams } from 'react-router'
import AnswerCard from '../../components/AnswerCard/AnswerCard'
import { ErrorState, LoadingState } from '../../components/LoadState/LoadState'
import ChatRequestFooter from '../../components/roommate/ChatRequestFooter'
import { candidateCard } from '../../components/roommate/candidateCard'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommateHeader from '../../components/roommate/RoommateHeader'
import RoommatePage from '../../components/roommate/RoommatePage'
import RoommateSheet from '../../components/roommate/RoommateSheet'
import { serverProfileCard } from '../../components/roommate/serverProfileCard'
import { getAnswerSummary } from '../../lib/answerSummary'
import { isServerMode } from '../../lib/api/config'
import { errorCode } from '../../lib/api/errorText'
import { parseId } from '../../lib/api/parse'
import { getChatReturnPath } from '../../lib/chat/routes'
import {
  getLifestyleSummary,
  getRoommateProfile,
  type LifestyleSummary,
  type RoommateProfile,
} from '../../lib/roommate/recommendationApi'
import {
  getCandidate,
  getCandidateAnswers,
} from '../../lib/roommate/roommateData'
import { useRoommate } from '../../lib/roommate/roommateState'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

type Loaded<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; value: T }

/**
 * Loads one value for this user and attempt. Each request is on its own, so the AI summary,
 * which can take a few seconds, never holds the rest of the profile back (채희 spec 7.4).
 */
function useLoad<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): [Loaded<T>, () => void] {
  const [attempt, setAttempt] = useState(0)
  const [loaded, setLoaded] = useState<{ attempt: number; value: Loaded<T> }>()

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      (value) => setLoaded({ attempt, value: { status: 'ready', value } }),
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setLoaded({ attempt, value: { status: 'error', error } })
        }
      },
    )
    return () => controller.abort()
    // The caller lists what the request depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, ...deps])

  const current: Loaded<T> =
    loaded?.attempt === attempt ? loaded.value : { status: 'loading' }
  return [current, () => setAttempt((count) => count + 1)]
}

/**
 * The AI summary of one person's habits. Figma's place for it is not in the exported frames, so
 * it uses the analysis section style above the answer cards (roommate OPEN_QUESTIONS RM-9).
 */
function LifestyleSummarySection({
  summary,
  onRetry,
}: {
  summary: Loaded<LifestyleSummary>
  onRetry: () => void
}) {
  return (
    <section
      aria-labelledby="lifestyle-summary-title"
      className="rounded-[12px] border border-brand-cream3 bg-brand-cream2 px-4 pt-4 pb-[13px] text-gray-500"
    >
      <h3
        id="lifestyle-summary-title"
        className="text-[16px] leading-[1.5] font-bold"
      >
        생활습관 요약
      </h3>
      {summary.status === 'loading' && (
        <LoadingState
          label="AI가 생활습관을 요약하고 있어요"
          className="py-4"
        />
      )}
      {summary.status === 'error' && (
        // A 409 here means the candidate has not finished the survey, not this user (spec 5).
        <ErrorState
          error={summary.error}
          onRetry={
            errorCode(summary.error) === 'ONBOARDING_REQUIRED'
              ? undefined
              : onRetry
          }
          className="py-4"
        />
      )}
      {summary.status === 'ready' && (
        <>
          <p className="mt-2 text-[14px] leading-[1.5] font-medium break-keep">
            {summary.value.summary}
          </p>
          {summary.value.keywords.length > 0 && (
            <ul
              aria-label="성향 키워드"
              className="mt-2.5 flex flex-wrap gap-1.5"
            >
              {summary.value.keywords.map((keyword, index) => (
                <li
                  key={index}
                  className="rounded-full bg-white px-2.5 py-0.5 text-[12px] leading-[1.5] font-semibold text-brand-brown3"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

/**
 * Server mode. The card comes from A's profile, and the match rate from the recommendation list
 * when it is loaded (the profile has no score). The answer cards need the candidate's chosen
 * options, which the profile response does not have yet (RM-9), so only the summary shows.
 */
function ServerDetailProfile({ userId }: { userId: number }) {
  const { state } = useLocation()
  const { recommendations, loadRecommendations } = useRoommate()
  const [profile, retryProfile] = useLoad<RoommateProfile>(
    (signal) => getRoommateProfile(userId, signal),
    [userId],
  )
  const [summary, retrySummary] = useLoad<LifestyleSummary>(
    (signal) => getLifestyleSummary(userId, signal),
    [userId],
  )
  const id = String(userId)
  const listed =
    recommendations.status === 'ready'
      ? recommendations.items.find((item) => item.userId === userId)
      : undefined

  return (
    <RoommatePage
      footer={
        <ChatRequestFooter
          candidateId={id}
          onChanged={() => loadRecommendations(true)}
        />
      }
    >
      <RoommateHeader
        backTo={ROOMMATE_ROUTES.analysis(id)}
        backState={getChatReturnPath(state) ? state : undefined}
        title="상세 프로필"
      />
      <div
        data-testid="roommate-scroll"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {profile.status === 'ready' ? (
          <ProfileHero
            profile={serverProfileCard(
              profile.value,
              listed ? listed.matchScore : undefined,
            )}
          />
        ) : profile.status === 'loading' ? (
          <LoadingState label="프로필을 불러오는 중이에요" />
        ) : (
          <ErrorState
            error={profile.error}
            onRetry={
              errorCode(profile.error) === 'TARGET_WITHDRAWN'
                ? undefined
                : retryProfile
            }
            className="px-6"
          />
        )}
        <RoommateSheet labelledBy="detail-summary-title" scrolls={false}>
          <div className="mx-auto w-full max-w-[390px] px-6 pt-[15px] pb-[35px]">
            <h2
              id="detail-summary-title"
              className="text-center text-[20px] leading-[1.5] font-bold tracking-[-0.4px] text-gray-500"
            >
              상세 답변 요약
            </h2>
            <div className="mt-[15px] flex flex-col gap-3">
              <LifestyleSummarySection
                summary={summary}
                onRetry={retrySummary}
              />
            </div>
          </div>
        </RoommateSheet>
      </div>
    </RoommatePage>
  )
}

/**
 * Figma 1377:36669 (first screen) and 1377:30540 (whole page). The summary cards show the
 * candidate's own answers with the same cards and grouping as the my page. The header and the
 * chat request bar stay in place, and the card and the answers scroll together between them
 * (QA 13). The card sits where the analysis screen has it (QA 12).
 */
function SampleDetailProfile({ candidateId }: { candidateId?: string }) {
  const { state } = useLocation()
  const candidate = getCandidate(candidateId)

  if (!candidate) {
    return <Navigate to={ROOMMATE_ROUTES.list} replace />
  }

  return (
    <RoommatePage footer={<ChatRequestFooter candidateId={candidate.id} />}>
      {/* Opened from a chat room, the analysis keeps that state so its back returns to the room. */}
      <RoommateHeader
        backTo={ROOMMATE_ROUTES.analysis(candidate.id)}
        backState={getChatReturnPath(state) ? state : undefined}
        title="상세 프로필"
      />
      <div
        data-testid="roommate-scroll"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <ProfileHero profile={candidateCard(candidate)} />
        <RoommateSheet labelledBy="detail-summary-title" scrolls={false}>
          <div className="mx-auto w-full max-w-[390px] px-6 pt-[15px] pb-[35px]">
            <h2
              id="detail-summary-title"
              className="text-center text-[20px] leading-[1.5] font-bold tracking-[-0.4px] text-gray-500"
            >
              상세 답변 요약
            </h2>
            <div className="mt-[15px] flex flex-col gap-3">
              {getAnswerSummary(getCandidateAnswers(candidate)).map((card) => (
                <AnswerCard key={card.category} card={card} />
              ))}
            </div>
          </div>
        </RoommateSheet>
      </div>
    </RoommatePage>
  )
}

export default function DetailProfilePage() {
  const { candidateId } = useParams()
  if (!isServerMode()) return <SampleDetailProfile candidateId={candidateId} />
  const userId = parseId(candidateId)
  if (userId === null) return <Navigate to={ROOMMATE_ROUTES.list} replace />
  return <ServerDetailProfile key={userId} userId={userId} />
}
