import { useCallback, useEffect } from 'react'
import { ApiError, isApiError } from '../api/apiError'
import { isServerMode } from '../api/config'
import { errorText } from '../api/errorText'
import { getSessionGeneration } from '../auth/tokenStore'
import type { CategoryId } from '../onboarding/categories'
import { useOnboarding } from '../onboarding/onboardingState'
import { useQuestion } from '../../pages/question/questionState'
import { fetchMySurvey, saveMySurvey, type MySurvey } from './surveyApi'
import {
  SurveyMappingError,
  fromServerAnswers,
  fromServerPriorities,
  toServerAnswers,
  toServerPriorities,
} from './surveyMapping'
import { MAX_PRIORITY_COUNT, MIN_PRIORITY_COUNT } from '../onboarding/priority'

/** Another save reached the server first (409 SURVEY_REVISION_CONFLICT). */
export class SurveyConflictError extends Error {
  /** The saved survey read again after the conflict. Nothing local was replaced with it. */
  readonly latest: MySurvey

  constructor(latest: MySurvey) {
    super('다른 곳에서 설문이 먼저 저장됐어요.')
    this.name = 'SurveyConflictError'
    this.latest = latest
  }
}

const sessionChanged = () =>
  new ApiError({
    kind: 'http',
    status: 401,
    code: 'SESSION_CHANGED',
    message: '다시 로그인해주세요.',
  })

/** The server survey does not match the screens: trying again cannot help. */
export function isSchemaMismatch(error: unknown) {
  return error instanceof SurveyMappingError && error.reason === 'schema'
}

/** The text for a failed save. A field error from the server keeps the server's message. */
export function describeSurveyError(error: unknown) {
  if (error instanceof SurveyMappingError) return error.message
  if (error instanceof SurveyConflictError) return error.message
  if (isApiError(error)) {
    const [field] = Object.values(error.fieldErrors)
    if (error.status === 400 && field) return field
  }
  return errorText(error, '설문을 저장하지 못했어요. 다시 시도해주세요.')
}

/**
 * Server mode: reads the saved survey once per session before a survey screen shows, so the
 * screens start from the saved answers and the next save knows its revision. Sample mode is
 * always ready and sends nothing.
 */
export function useSavedSurvey() {
  const { sync, loadSaved } = useQuestion()
  const isServer = isServerMode()

  useEffect(() => {
    if (isServer && sync.status === 'idle') loadSaved().catch(() => {})
  }, [isServer, sync.status, loadSaved])

  const retry = useCallback(() => {
    loadSaved().catch(() => {})
  }, [loadSaved])

  if (!isServer) return { status: 'ready' as const, retry }
  if (sync.status === 'ready') return { status: 'ready' as const, retry }
  if (sync.status === 'failed') {
    return { status: 'failed' as const, error: sync.error, retry }
  }
  return { status: 'loading' as const, retry }
}

const isPrioritySet = (priorities: readonly CategoryId[]) =>
  priorities.length >= MIN_PRIORITY_COUNT &&
  priorities.length <= MAX_PRIORITY_COUNT

/**
 * Saves the survey with PUT /api/me/survey (server mode; null in sample mode, which saves
 * nothing). It sends all 16 answers by `question_code`/`option_code`, the priorities chosen in
 * this session or else the saved ones, and the revision read at the start of this session.
 *
 * One save runs at a time per session. If another account signs in meanwhile, no further request
 * is sent for the previous one. A 409 SURVEY_REVISION_CONFLICT reads the saved survey again and
 * rejects with SurveyConflictError; nothing local is replaced and nothing is sent again until the
 * user chooses (`saveOverLatest` or `takeLatest`).
 */
export function useSurveySubmit() {
  const { data: onboarding, update: updateOnboarding } = useOnboarding()
  const {
    answers,
    replaceAnswers,
    loadSaved,
    recordSaved,
    finishRetake,
    beginSave,
    endSave,
  } = useQuestion()

  const submit = async () => {
    if (!beginSave()) throw new Error('A survey save is already running.')
    const generation = getSessionGeneration()
    const checkpoint = () => {
      if (getSessionGeneration() !== generation) throw sessionChanged()
    }
    try {
      const saved = await loadSaved()
      checkpoint()
      const priorities = isPrioritySet(onboarding.priorities)
        ? onboarding.priorities
        : saved.priorities
      const body = {
        expected_revision: saved.revision,
        priorities: toServerPriorities(priorities),
        answers: toServerAnswers(answers, saved.mapping),
      }
      try {
        const result = await saveMySurvey(body)
        checkpoint()
        recordSaved({
          revision: result.revision,
          priorities: [...priorities],
          answers,
        })
        if (onboarding.priorities.length === 0) {
          updateOnboarding({ priorities: [...priorities] })
        }
        finishRetake()
      } catch (error) {
        if (!isApiError(error) || error.code !== 'SURVEY_REVISION_CONFLICT') {
          throw error
        }
        checkpoint()
        const latest = await fetchMySurvey()
        checkpoint()
        throw new SurveyConflictError(latest)
      }
    } finally {
      endSave()
    }
  }

  /** The newer saved survey read on a conflict: it is what the server holds now. */
  const recordLatest = async (latest: MySurvey) => {
    const saved = await loadSaved()
    const snapshot = {
      revision: latest.revision,
      priorities: fromServerPriorities(latest.priorities),
      answers: fromServerAnswers(latest.answers, saved.mapping).answers,
    }
    recordSaved(snapshot)
    return snapshot
  }

  /**
   * The user chose to save these answers over the newer saved ones: the next save uses that
   * revision. The answers on screen stay as they are.
   */
  const saveOverLatest = async (latest: MySurvey) => {
    await recordLatest(latest)
  }

  /** The user chose the saved survey: it replaces the answers and priorities on screen. */
  const takeLatest = async (latest: MySurvey) => {
    const { priorities, answers: savedAnswers } = await recordLatest(latest)
    replaceAnswers(savedAnswers)
    if (priorities.length > 0) updateOnboarding({ priorities })
    finishRetake()
  }

  return isServerMode() ? { submit, saveOverLatest, takeLatest } : null
}
