import { apiRequest } from '../api/apiClient'
import {
  getUserTestCohort,
  isFeedbackApiEnabled,
  isUserTestEnabled,
} from './config'
import {
  QUESTION_VERSION,
  getParticipantId,
  getUserTestState,
  update,
  type DataSource,
  type FeedbackRecord,
  type QuestionId,
  type SurveyStatus,
} from './userTestStore'

/**
 * When and how the feedback questions show, and where the answers go.
 *
 * - Each question shows once per cohort: once it was shown it is never queued again, and an
 *   answer or a skip is final. A reload while it is open shows it again until it is answered.
 * - The screens queue a question at a natural stop (`queuePrompt`) and the next screen shows
 *   the first one it may (`nextPrompt`). One screen entry shows one question at most.
 * - Answers are sent with the proposed collection API when it is turned on; otherwise they stay
 *   on the device as `local`. A failure never blocks the next step and is tried again later.
 */

export function currentSurveyStatus(answeredCount: number): SurveyStatus {
  if (getUserTestState().surveyCompleted) return 'completed'
  return answeredCount > 0 ? 'in_progress' : 'not_started'
}

function isDone(questionId: QuestionId) {
  return getUserTestState().feedback[questionId] !== undefined
}

/** Puts a question in line for the next stop, unless it was already shown or queued. */
export function queuePrompt(
  questionId: QuestionId,
  targetProfileId: string | null,
  dataSource: DataSource,
) {
  if (!isUserTestEnabled() || isDone(questionId)) return
  update((state) =>
    state.pending.some((item) => item.questionId === questionId)
      ? {
          ...state,
          // The latest profile is the one the question asks about.
          pending: state.pending.map((item) =>
            item.questionId === questionId
              ? { questionId, targetProfileId, dataSource }
              : item,
          ),
        }
      : {
          ...state,
          pending: [
            ...state.pending,
            { questionId, targetProfileId, dataSource },
          ],
        },
  )
}

/** Takes a question off the line without showing it, such as Q3 for a profile never compared. */
export function dropPrompt(questionId: QuestionId) {
  update((state) => ({
    ...state,
    pending: state.pending.filter((item) => item.questionId !== questionId),
  }))
}

/** The record of a question that is open now (shown, not answered or skipped yet). */
export function openRecord(): FeedbackRecord | null {
  const records = Object.values(getUserTestState().feedback)
  return records.find((record) => record?.status === 'shown') ?? null
}

/**
 * Shows the first queued question of `allowed` and records it as shown, with a snapshot of the
 * mode, data source and survey state. Returns the open question when there already is one.
 */
export function showNextPrompt(
  allowed: readonly QuestionId[],
  answeredCount: number,
): FeedbackRecord | null {
  if (!isUserTestEnabled()) return null
  const open = openRecord()
  if (open) return open
  const state = getUserTestState()
  const next = state.pending.find((item) => allowed.includes(item.questionId))
  if (!next) return null
  const record: FeedbackRecord = {
    questionId: next.questionId,
    questionVersion: QUESTION_VERSION,
    status: 'shown',
    optionId: null,
    comment: null,
    experienceMode: state.mode,
    dataSource: next.dataSource,
    surveyStatus: currentSurveyStatus(answeredCount),
    targetProfileId: next.targetProfileId,
    shownAt: new Date().toISOString(),
    submittedAt: null,
    delivery: 'pending',
  }
  update((current) => ({
    ...current,
    feedback: { ...current.feedback, [next.questionId]: record },
    pending: current.pending.filter(
      (item) => item.questionId !== next.questionId,
    ),
  }))
  void deliver(next.questionId)
  return record
}

/** An answer, or a skip with `optionId: null`. Closing the sheet counts as a skip. */
export function finishPrompt(
  questionId: QuestionId,
  answer: { optionId: string; comment: string | null } | null,
) {
  const record = getUserTestState().feedback[questionId]
  if (!record || record.status !== 'shown') return
  const comment = answer?.comment?.trim() || null
  update((state) => ({
    ...state,
    feedback: {
      ...state.feedback,
      [questionId]: {
        ...record,
        status: answer ? 'answered' : 'skipped',
        optionId: answer?.optionId ?? null,
        comment: answer ? comment : null,
        submittedAt: new Date().toISOString(),
        delivery: 'pending',
      },
    },
  }))
  void deliver(questionId)
}

// ---------------------------------------------------------------------------------------------
// Delivery

/**
 * The proposed body of `PUT /api/user-test/feedback/{questionId}` (docs/user-test/backend-
 * contract.md). The participant comes from the access token on the server, never from the body.
 */
export function feedbackBody(record: FeedbackRecord) {
  return {
    campaign_id: getUserTestCohort(),
    question_version: record.questionVersion,
    status: record.status,
    option_id: record.optionId,
    comment: record.comment,
    experience_mode: record.experienceMode,
    data_source: record.dataSource,
    survey_status: record.surveyStatus,
    target_profile_id: record.targetProfileId,
    client_shown_at: record.shownAt,
    client_submitted_at: record.submittedAt,
  }
}

const inFlight = new Set<string>()

/**
 * Sends one question's latest record. The same key always replaces the same row on the server,
 * so a retry never adds another. It sends only for the tester who is signed in now.
 */
async function deliver(questionId: QuestionId) {
  const participant = getParticipantId()
  const record = getUserTestState().feedback[questionId]
  if (!record || record.delivery === 'sent' || participant === null) return
  if (!isFeedbackApiEnabled()) {
    if (record.delivery !== 'local') setDelivery(questionId, record, 'local')
    return
  }
  const lock = `${participant}:${questionId}`
  if (inFlight.has(lock)) return
  inFlight.add(lock)
  try {
    await apiRequest(`/api/user-test/feedback/${questionId}`, {
      method: 'PUT',
      body: feedbackBody(record),
    })
    // Another account may have signed in meanwhile: its state is not touched.
    if (getParticipantId() === participant) {
      setDelivery(questionId, record, 'sent')
    }
  } catch {
    // Stays pending and is tried again on the next screen.
  } finally {
    inFlight.delete(lock)
  }
}

/** Marks the record as delivered only if it did not change while it was sent. */
function setDelivery(
  questionId: QuestionId,
  sent: FeedbackRecord,
  delivery: FeedbackRecord['delivery'],
) {
  update((state) => {
    const current = state.feedback[questionId]
    if (
      !current ||
      current.status !== sent.status ||
      current.submittedAt !== sent.submittedAt
    ) {
      return state
    }
    return {
      ...state,
      feedback: { ...state.feedback, [questionId]: { ...current, delivery } },
    }
  })
}

/** Tries again every record that was not delivered, such as after a failure or a reload. */
export function retryDeliveries() {
  if (!isUserTestEnabled()) return
  const { feedback } = getUserTestState()
  for (const record of Object.values(feedback)) {
    if (record && record.delivery !== 'sent') void deliver(record.questionId)
  }
}
