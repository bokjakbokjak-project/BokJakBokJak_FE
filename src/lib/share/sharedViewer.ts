import { useEffect, useState } from 'react'
import { apiRequest } from '../api/apiClient'
import { isApiError } from '../api/apiError'
import { useAuth } from '../auth/authState'
import { routeForNextStep } from '../auth/nextStep'
import { fetchMyStatus } from '../auth/statusApi'
import { fetchMyProfile } from '../profile/profileApi'
import { userTestStartRoute } from '../userTest/signIn'
import { QUESTION_ROUTES } from '../../pages/question/questionData'

/**
 * Who opened a shared profile, which decides everything the page offers (requested 2026-11-20):
 *
 * - `guest`: not signed in (or sample mode, which has no account). The rows after the first stay
 *   blurred; `복작복작으로 이동` signs in and comes back here.
 * - `needs-survey`: signed in without a finished survey. Still blurred; the button opens the
 *   survey (or the onboarding first) and the survey result brings the user back here.
 * - `member`: signed in with a finished survey. Every row shows, with the match rate.
 * - `self`: the person who shared it. They see their own profile where the my page shows it.
 * - `error`: the status could not be read. The rows stay blurred and it can be tried again.
 */
export type SharedViewer =
  | { kind: 'checking' }
  | { kind: 'guest' }
  | { kind: 'needs-survey'; route: string }
  | { kind: 'member' }
  | { kind: 'self' }
  | { kind: 'error' }

export type MatchScore =
  { status: 'none' } | { status: 'ready'; rate: number } | { status: 'failed' }

function parseMatchScore(value: unknown, userId: number): number {
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
  return data.match_score
}

const isSurveyRequired = (error: unknown) =>
  isApiError(error) && error.code === 'SURVEY_REQUIRED'

/** `sharerId` is the sharer's user id in the link; old links have none. */
export function useSharedViewer(sharerId: number | undefined) {
  const { status } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    key: string
    viewer: SharedViewer
    score: MatchScore
  } | null>(null)
  const key = `${status}:${sharerId ?? ''}:${attempt}`

  useEffect(() => {
    if (status !== 'authenticated') return
    let active = true
    const settle = (
      viewer: SharedViewer,
      score: MatchScore = { status: 'none' },
    ) => {
      if (active) setResult({ key, viewer, score })
    }
    const check = async () => {
      let nextStep
      try {
        nextStep = (await fetchMyStatus()).nextStep
      } catch {
        settle({ kind: 'error' })
        return
      }
      if (nextStep !== 'HOME') {
        // The user test sends a tester without a survey to its own start screen.
        settle({
          kind: 'needs-survey',
          route:
            userTestStartRoute(routeForNextStep(nextStep)) ??
            routeForNextStep(nextStep),
        })
        return
      }
      if (sharerId !== undefined) {
        try {
          const me = await fetchMyProfile()
          if (me.userId === sharerId) {
            settle({ kind: 'self' })
            return
          }
        } catch (error) {
          if (isSurveyRequired(error)) {
            settle({ kind: 'needs-survey', route: QUESTION_ROUTES.survey })
            return
          }
          // Without the profile the page still opens; it only cannot tell the sharer apart.
        }
      }
      // The answers are in the link, so the rows open even when the rate cannot be read.
      if (sharerId === undefined) {
        settle({ kind: 'member' })
        return
      }
      try {
        const rate = parseMatchScore(
          await apiRequest(`/api/share/${sharerId}/match-score`, {
            retried401: 'fail',
          }),
          sharerId,
        )
        settle({ kind: 'member' }, { status: 'ready', rate })
      } catch (error) {
        if (isSurveyRequired(error)) {
          settle({ kind: 'needs-survey', route: QUESTION_ROUTES.survey })
          return
        }
        settle({ kind: 'member' }, { status: 'failed' })
      }
    }
    void check()
    return () => {
      active = false
    }
  }, [status, sharerId, key])

  const viewer: SharedViewer =
    status === 'restoring'
      ? { kind: 'checking' }
      : status !== 'authenticated'
        ? { kind: 'guest' }
        : result?.key === key
          ? result.viewer
          : { kind: 'checking' }
  const score: MatchScore =
    status === 'authenticated' && result?.key === key
      ? result.score
      : { status: 'none' }

  return { viewer, score, retry: () => setAttempt((count) => count + 1) }
}
