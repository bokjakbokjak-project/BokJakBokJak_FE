import { createContext, useContext } from 'react'
import type { CategoryId } from '../../lib/onboarding/categories'
import type { SurveyMapping } from '../../lib/survey/surveyMapping'

/** Chosen option per question index, 0-15. Missing means not answered yet. */
export type QuestionAnswers = Readonly<Record<number, string>>

/** The saved survey on the server, read once per session (server mode only). */
export type SavedSurvey = {
  /** `expected_revision` of the next save: the revision this session's answers start from. */
  revision: number
  surveyCompleted: boolean
  /** Saved priorities in rank order, empty when there are none. */
  priorities: CategoryId[]
  /**
   * The answers the server confirmed, kept apart from the answers being edited, so the result
   * screen never shows an unsaved retake. Empty before the first submit.
   */
  answers: QuestionAnswers
  /**
   * The answers to start editing from: the saved ones, or the old answers of a survey that must
   * be answered again because questions were added (no answer for the new questions).
   */
  startAnswers: QuestionAnswers
  mapping: SurveyMapping
}

/** What the server holds after a save, or after the user picked the newer saved survey. */
export type SavedSnapshot = Pick<
  SavedSurvey,
  'revision' | 'priorities' | 'answers'
>

/** A reading taken for a retake, not yet committed (`saved` is null in sample mode). */
export type RetakeRead = {
  saved: SavedSurvey | null
  /** How many saves had been recorded when the reading began. */
  saveCount: number
}

export type SurveySync =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'failed'; error: unknown }
  | ({ status: 'ready' } & SavedSurvey)

type QuestionContextValue = {
  answers: QuestionAnswers
  answer: (index: number, option: string) => void
  /** Replaces every answer at once, such as the saved answers read from the server. */
  replaceAnswers: (answers: QuestionAnswers) => void
  /**
   * The step on screen (0-15), in the priority order (getTopicOrder), not the question index that
   * keys the answers. Kept here so the profile's back button returns to the last question.
   */
  index: number
  /**
   * The topic order (`getTopicOrder(...).join()`) the step was taken in, or null when the step
   * means the same in any order. When the priorities change, the survey moves the step to the same
   * question in the new order (or to an earlier unanswered one).
   */
  indexOrder: string | null
  setIndex: (index: number, order?: string | null) => void
  /** Clears every answer and returns to the first question, for retaking the survey. */
  reset: () => void
  /**
   * 마이페이지 「설문조사 다시 하기」: marks a retake, starting from the saved priorities and
   * answers (requested by the backend, 2026-11-20). A retake saves the priorities with the survey
   * (PUT /api/me/survey), not with the onboarding.
   */
  isRetake: boolean
  /** Reads what the server holds now for a retake, changing nothing. */
  readForRetake: () => Promise<RetakeRead>
  /** Starts the retake from that reading (committing it): prefilled, at the priority step. */
  startRetake: (read: RetakeRead) => void
  /**
   * The same priority-first path without clearing any answers: for a first survey whose saved
   * priorities could not be read (none on the server, none in this session). The chosen
   * priorities are saved with the survey, since the onboarding answers are no longer in memory.
   */
  choosePriorities: () => void
  finishRetake: () => void
  /** Server mode: the saved survey of this session. */
  sync: SurveySync
  /** Reads the saved survey once; concurrent callers share the request. */
  loadSaved: () => Promise<SavedSurvey>
  /** Records what the server now holds: after a save, or the newer survey read on a conflict. */
  recordSaved: (snapshot: SavedSnapshot) => void
  /** One survey save at a time per session, whichever screen started it. */
  isSaving: boolean
  beginSave: () => boolean
  endSave: () => void
  /** The "new questions were added" notice shows once per session. */
  hasSeenUpdateNotice: boolean
  markUpdateNoticeSeen: () => void
}

export const QuestionContext = createContext<QuestionContextValue | null>(null)

export function useQuestion() {
  const value = useContext(QuestionContext)
  if (!value) {
    throw new Error('useQuestion must be used inside QuestionProvider')
  }
  return value
}
