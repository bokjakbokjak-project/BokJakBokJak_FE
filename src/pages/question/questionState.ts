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
  mapping: SurveyMapping
}

/** What the server holds after a save, or after the user picked the newer saved survey. */
export type SavedSnapshot = Pick<
  SavedSurvey,
  'revision' | 'priorities' | 'answers'
>

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
  /** Kept here so the profile's back button returns to the last question. */
  index: number
  setIndex: (index: number) => void
  /** Clears every answer and returns to the first question, for retaking the survey. */
  reset: () => void
  /**
   * 마이페이지 「설문조사 다시 하기」: clears the answers like `reset` and marks a retake. A
   * retake saves the new priorities with the survey (PUT /api/me/survey), not with the
   * onboarding, and does not refill the answers from the server.
   */
  isRetake: boolean
  startRetake: () => void
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
}

export const QuestionContext = createContext<QuestionContextValue | null>(null)

export function useQuestion() {
  const value = useContext(QuestionContext)
  if (!value) {
    throw new Error('useQuestion must be used inside QuestionProvider')
  }
  return value
}
