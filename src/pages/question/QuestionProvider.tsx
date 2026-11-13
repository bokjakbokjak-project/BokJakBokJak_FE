import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { ApiError } from '../../lib/api/apiError'
import { getSessionGeneration } from '../../lib/auth/tokenStore'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { fetchMySurvey, fetchSurveySchema } from '../../lib/survey/surveyApi'
import {
  buildSurveyMapping,
  fromServerAnswers,
  fromServerPriorities,
} from '../../lib/survey/surveyMapping'
import {
  QuestionContext,
  type QuestionAnswers,
  type SavedSnapshot,
  type SavedSurvey,
  type SurveySync,
} from './questionState'

const sessionChanged = () =>
  new ApiError({
    kind: 'http',
    status: 401,
    code: 'SESSION_CHANGED',
    message: '다시 로그인해주세요.',
  })

/**
 * Keeps the answers in memory across the survey screens of a session. In server mode it also
 * reads the saved survey once (GET /api/surveys/current and GET /api/me/survey): the revision for
 * the next save, the saved priorities, and the saved answers, which fill the screens when nothing
 * was answered yet in this session. A new session remounts this provider (SessionBoundary).
 */
export default function QuestionProvider() {
  const { data: onboarding, update: updateOnboarding } = useOnboarding()
  const [answers, setAnswers] = useState<QuestionAnswers>({})
  const [index, setIndex] = useState(0)
  const [isRetake, setIsRetake] = useState(false)
  const isRetakeRef = useRef(false)
  const [sync, setSync] = useState<SurveySync>({ status: 'idle' })
  const savedRef = useRef<SavedSurvey | null>(null)
  const loadRef = useRef<Promise<SavedSurvey> | null>(null)
  const onboardingPrioritiesRef = useRef(onboarding.priorities)
  const isSavingRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    onboardingPrioritiesRef.current = onboarding.priorities
  }, [onboarding.priorities])

  const answer = useCallback((question: number, option: string) => {
    setAnswers((current) => ({ ...current, [question]: option }))
  }, [])
  const replaceAnswers = useCallback((next: QuestionAnswers) => {
    setAnswers(next)
  }, [])
  const reset = useCallback(() => {
    setAnswers({})
    setIndex(0)
  }, [])
  const choosePriorities = useCallback(() => {
    isRetakeRef.current = true
    setIsRetake(true)
  }, [])
  const startRetake = useCallback(() => {
    reset()
    choosePriorities()
  }, [reset, choosePriorities])
  const finishRetake = useCallback(() => {
    isRetakeRef.current = false
    setIsRetake(false)
  }, [])

  const loadSaved = useCallback(() => {
    if (savedRef.current) return Promise.resolve(savedRef.current)
    if (loadRef.current) return loadRef.current
    const generation = getSessionGeneration()
    setSync({ status: 'loading' })
    const promise = Promise.all([fetchSurveySchema(), fetchMySurvey()])
      .then(([schema, mine]) => {
        if (getSessionGeneration() !== generation) throw sessionChanged()
        const mapping = buildSurveyMapping(schema)
        const savedAnswers = mine.surveyCompleted
          ? fromServerAnswers(mine.answers, mapping).answers
          : {}
        const saved: SavedSurvey = {
          revision: mine.revision,
          surveyCompleted: mine.surveyCompleted,
          priorities: fromServerPriorities(mine.priorities),
          answers: savedAnswers,
          mapping,
        }
        // A retake starts over, and answers given in this session are never replaced.
        if (!isRetakeRef.current) {
          if (mine.surveyCompleted) {
            setAnswers((current) =>
              Object.keys(current).length > 0 ? current : savedAnswers,
            )
          }
          if (
            saved.priorities.length > 0 &&
            onboardingPrioritiesRef.current.length === 0
          ) {
            updateOnboarding({ priorities: saved.priorities })
          }
        }
        savedRef.current = saved
        setSync({ status: 'ready', ...saved })
        return saved
      })
      .catch((error: unknown) => {
        if (getSessionGeneration() === generation) {
          setSync({ status: 'failed', error })
        }
        throw error
      })
      .finally(() => {
        loadRef.current = null
      })
    loadRef.current = promise
    return promise
  }, [updateOnboarding])

  const recordSaved = useCallback((snapshot: SavedSnapshot) => {
    const current = savedRef.current
    if (!current) return
    const next = { ...current, ...snapshot, surveyCompleted: true }
    savedRef.current = next
    setSync({ status: 'ready', ...next })
  }, [])

  const beginSave = useCallback(() => {
    if (isSavingRef.current) return false
    isSavingRef.current = true
    setIsSaving(true)
    return true
  }, [])
  const endSave = useCallback(() => {
    isSavingRef.current = false
    setIsSaving(false)
  }, [])

  const value = useMemo(
    () => ({
      answers,
      answer,
      replaceAnswers,
      index,
      setIndex,
      reset,
      isRetake,
      startRetake,
      choosePriorities,
      finishRetake,
      sync,
      loadSaved,
      recordSaved,
      isSaving,
      beginSave,
      endSave,
    }),
    [
      answers,
      answer,
      replaceAnswers,
      index,
      reset,
      isRetake,
      startRetake,
      choosePriorities,
      finishRetake,
      sync,
      loadSaved,
      recordSaved,
      isSaving,
      beginSave,
      endSave,
    ],
  )

  return (
    <QuestionContext.Provider value={value}>
      <Outlet />
    </QuestionContext.Provider>
  )
}
