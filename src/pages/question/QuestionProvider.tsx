import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet } from 'react-router'
import { ApiError, isApiError } from '../../lib/api/apiError'
import { isServerMode } from '../../lib/api/config'
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
  type RetakeRead,
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

/** Reads the saved survey (server mode) without touching any state. */
async function readSavedSurvey(): Promise<SavedSurvey> {
  const [schema, mine] = await Promise.all([
    fetchSurveySchema(),
    fetchMySurvey(),
  ])
  const mapping = buildSurveyMapping(schema)
  // The server sends the old answers of a survey that must be answered again too (BE PR #73), so
  // they fill the screens, but only a completed survey counts as saved answers.
  const startAnswers = fromServerAnswers(mine.answers, mapping).answers
  return {
    revision: mine.revision,
    surveyCompleted: mine.surveyCompleted,
    priorities: fromServerPriorities(mine.priorities),
    answers: mine.surveyCompleted ? startAnswers : {},
    startAnswers,
    mapping,
  }
}

/**
 * Keeps the answers in memory across the survey screens of a session. In server mode it also
 * reads the saved survey once (GET /api/surveys/current and GET /api/me/survey): the revision for
 * the next save, the saved priorities, and the saved answers, which fill the screens when nothing
 * was answered or chosen yet in this session. That includes a retake from the my page and a user
 * who must answer again after new questions were added (the old answers come back, without the
 * new questions). A new session remounts this provider (SessionBoundary).
 */
export default function QuestionProvider() {
  const { data: onboarding, update: updateOnboarding } = useOnboarding()
  const [answers, setAnswers] = useState<QuestionAnswers>({})
  // The step and the topic order it was taken in (null: valid in any order, such as step 0).
  const [position, setPosition] = useState<{
    index: number
    order: string | null
  }>({ index: 0, order: null })
  const setIndex = useCallback(
    (index: number, order: string | null = null) =>
      setPosition({ index, order }),
    [],
  )
  const [isRetake, setIsRetake] = useState(false)
  const [sync, setSync] = useState<SurveySync>({ status: 'idle' })
  const savedRef = useRef<SavedSurvey | null>(null)
  const loadRef = useRef<Promise<SavedSurvey> | null>(null)
  const onboardingPrioritiesRef = useRef(onboarding.priorities)
  const isSavingRef = useRef(false)
  /** Counts recorded saves, so a read that started before one cannot replace it. */
  const saveCountRef = useRef(0)
  const [isSaving, setIsSaving] = useState(false)
  const [hasSeenUpdateNotice, setHasSeenUpdateNotice] = useState(false)
  const markUpdateNoticeSeen = useCallback(
    () => setHasSeenUpdateNotice(true),
    [],
  )

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
  }, [setIndex])
  const choosePriorities = useCallback(() => {
    setIsRetake(true)
  }, [])
  // Starts editing from the saved survey, unless this session already has answers or priorities.
  const fillFromSaved = useCallback(
    (saved: SavedSurvey) => {
      setAnswers((current) =>
        Object.keys(current).length > 0 ? current : saved.startAnswers,
      )
      if (
        saved.priorities.length > 0 &&
        onboardingPrioritiesRef.current.length === 0
      ) {
        updateOnboarding({ priorities: saved.priorities })
      }
    },
    [updateOnboarding],
  )
  const finishRetake = useCallback(() => {
    setIsRetake(false)
  }, [])

  const loadSaved = useCallback(() => {
    if (savedRef.current) return Promise.resolve(savedRef.current)
    if (loadRef.current) return loadRef.current
    const generation = getSessionGeneration()
    setSync({ status: 'loading' })
    const promise = readSavedSurvey()
      .then((saved) => {
        if (getSessionGeneration() !== generation) throw sessionChanged()
        // A retake that started meanwhile already holds a reading as new as this one.
        if (savedRef.current) return savedRef.current
        // Answers or priorities given in this session are never replaced.
        fillFromSaved(saved)
        savedRef.current = saved
        setSync({ status: 'ready', ...saved })
        return saved
      })
      .catch((error: unknown) => {
        if (getSessionGeneration() !== generation) throw error
        // A retake committed a reading meanwhile: that one stands, not this failure.
        if (savedRef.current) return savedRef.current
        setSync({ status: 'failed', error })
        throw error
      })
      .finally(() => {
        loadRef.current = null
      })
    loadRef.current = promise
    return promise
  }, [fillFromSaved])

  // 마이페이지 「설문조사 다시 하기」 in two parts, so that nothing changes unless the retake really
  // starts. `readForRetake` reads what the server holds now (server mode) and keeps it to itself:
  // no cached survey, revision or answer changes. If the read fails, the survey read before stands
  // in. The caller passes the result to `startRetake` only if the user is still waiting (not
  // cancelled, not gone); that commits the reading and starts the edit from it, prefilled, replacing
  // whatever an earlier unsaved retake left. So nothing can be edited while the read is out, and the
  // edit and its revision come from the same reading. Sample mode keeps the answers and priorities
  // in memory as they are.
  const readForRetake = useCallback(async (): Promise<RetakeRead> => {
    const saveCount = saveCountRef.current
    if (!isServerMode()) return { saved: null, saveCount }
    const generation = getSessionGeneration()
    try {
      const saved = await readSavedSurvey()
      if (getSessionGeneration() !== generation) throw sessionChanged()
      return { saved, saveCount }
    } catch (error) {
      if (isApiError(error) && error.code === 'SESSION_CHANGED') throw error
      return { saved: savedRef.current, saveCount }
    }
  }, [])
  const startRetake = useCallback(
    (read: RetakeRead) => {
      // A save recorded after the read began is newer than what the read saw.
      const saved =
        saveCountRef.current === read.saveCount ? read.saved : savedRef.current
      if (saved && saved !== savedRef.current) {
        savedRef.current = saved
        setSync({ status: 'ready', ...saved })
      }
      setIndex(0)
      choosePriorities()
      if (!saved) return
      setAnswers(saved.startAnswers)
      if (saved.priorities.length > 0) {
        updateOnboarding({ priorities: saved.priorities })
      }
    },
    [choosePriorities, setIndex, updateOnboarding],
  )

  const recordSaved = useCallback((snapshot: SavedSnapshot) => {
    const current = savedRef.current
    if (!current) return
    const next = {
      ...current,
      ...snapshot,
      startAnswers: snapshot.answers,
      surveyCompleted: true,
    }
    saveCountRef.current += 1
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
      index: position.index,
      indexOrder: position.order,
      setIndex,
      reset,
      isRetake,
      readForRetake,
      startRetake,
      choosePriorities,
      finishRetake,
      sync,
      loadSaved,
      recordSaved,
      isSaving,
      beginSave,
      endSave,
      hasSeenUpdateNotice,
      markUpdateNoticeSeen,
    }),
    [
      answers,
      answer,
      replaceAnswers,
      position,
      setIndex,
      reset,
      isRetake,
      readForRetake,
      startRetake,
      choosePriorities,
      finishRetake,
      sync,
      loadSaved,
      recordSaved,
      isSaving,
      beginSave,
      endSave,
      hasSeenUpdateNotice,
      markUpdateNoticeSeen,
    ],
  )

  return (
    <QuestionContext.Provider value={value}>
      <Outlet />
    </QuestionContext.Provider>
  )
}
