import { useSyncExternalStore } from 'react'
import { onTokensCleared } from '../auth/tokenStore'
import { getUserTestCohort, isUserTestEnabled } from './config'

/**
 * The user test state of the signed-in tester, kept per cohort and per user:
 *
 * - The participant (the server's user id) lives in sessionStorage with the session and is
 *   cleared with the tokens, so another account never reads it.
 * - Everything else lives in localStorage under `bokjak-user-test:{cohort}:{participant}`, so a
 *   reload or back keeps the mode and the answered questions, and two accounts on one device
 *   never mix.
 */

export type ExperienceMode = 'live' | 'demo'
export type SurveyStatus = 'not_started' | 'in_progress' | 'completed'
export type DataSource = 'real' | 'example'

export const QUESTION_IDS = [
  'q1_discovery',
  'q2_understanding',
  'q3_negotiation',
] as const
export type QuestionId = (typeof QUESTION_IDS)[number]
export const QUESTION_VERSION = 'v1'

/** Where an answer is. `local` means it is kept on this device only (no collection API yet). */
export type DeliveryStatus = 'pending' | 'sent' | 'local'

/** One question for one tester. Mirrors `FeedbackRecord` of the request. */
export type FeedbackRecord = {
  questionId: QuestionId
  questionVersion: typeof QUESTION_VERSION
  status: 'shown' | 'answered' | 'skipped'
  optionId: string | null
  comment: string | null
  /** A snapshot of when it was shown; a later mode change does not rewrite it. */
  experienceMode: ExperienceMode
  dataSource: DataSource
  surveyStatus: SurveyStatus
  targetProfileId: string | null
  /** Device time; the server records its own receipt time. */
  shownAt: string
  submittedAt: string | null
  delivery: DeliveryStatus
}

/** A question waiting for the next natural stop, with what it is about. */
export type PendingPrompt = {
  questionId: QuestionId
  targetProfileId: string | null
  dataSource: DataSource
}

export type UserTestState = {
  mode: ExperienceMode
  /** True once a full survey was saved with the server in this cohort (or before it). */
  surveyCompleted: boolean
  /** True once the onboarding (test basic information and priorities) was saved. */
  onboardingCompleted: boolean
  feedback: Partial<Record<QuestionId, FeedbackRecord>>
  pending: PendingPrompt[]
}

const INITIAL_STATE: UserTestState = {
  mode: 'live',
  surveyCompleted: false,
  onboardingCompleted: false,
  feedback: {},
  pending: [],
}

const PARTICIPANT_KEY = 'bokjak-user-test-participant'

// ---------------------------------------------------------------------------------------------
// Participant

let memoryParticipant: number | null = null

export function getParticipantId(): number | null {
  try {
    const stored = sessionStorage.getItem(PARTICIPANT_KEY)
    if (stored !== null) {
      const id = Number(stored)
      return Number.isSafeInteger(id) && id > 0 ? id : null
    }
  } catch {
    // Kept in memory only.
  }
  return memoryParticipant
}

/** Records who signed in, from the login answer's `user_id`, with what the server knows. */
export function startParticipant(
  participantId: number,
  known: { onboardingCompleted: boolean; surveyCompleted: boolean },
) {
  memoryParticipant = participantId
  try {
    sessionStorage.setItem(PARTICIPANT_KEY, String(participantId))
  } catch {
    // Kept in memory only.
  }
  cached = null
  // The server's answer wins: it only ever moves these forward.
  update((state) => ({
    ...state,
    onboardingCompleted: state.onboardingCompleted || known.onboardingCompleted,
    surveyCompleted: state.surveyCompleted || known.surveyCompleted,
  }))
}

function clearParticipant() {
  memoryParticipant = null
  try {
    sessionStorage.removeItem(PARTICIPANT_KEY)
  } catch {
    // Nothing was stored.
  }
  cached = null
  emit()
}

onTokensCleared(clearParticipant)

// ---------------------------------------------------------------------------------------------
// State

function storageKey() {
  const cohort = getUserTestCohort()
  const participant = getParticipantId()
  if (!cohort || participant === null) return null
  return `bokjak-user-test:${cohort}:${participant}`
}

const memoryStates = new Map<string, UserTestState>()
let cached: { key: string | null; state: UserTestState } | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A stored state that does not look right is dropped rather than half read. */
function parseState(raw: string | null): UserTestState {
  if (!raw) return INITIAL_STATE
  try {
    const value: unknown = JSON.parse(raw)
    if (
      !isRecord(value) ||
      (value.mode !== 'live' && value.mode !== 'demo') ||
      typeof value.surveyCompleted !== 'boolean' ||
      typeof value.onboardingCompleted !== 'boolean' ||
      !isRecord(value.feedback) ||
      !Array.isArray(value.pending)
    ) {
      return INITIAL_STATE
    }
    return value as UserTestState
  } catch {
    return INITIAL_STATE
  }
}

function read(): UserTestState {
  const key = storageKey()
  if (cached && cached.key === key) return cached.state
  let state = INITIAL_STATE
  if (key) {
    try {
      state = parseState(localStorage.getItem(key))
    } catch {
      state = memoryStates.get(key) ?? INITIAL_STATE
    }
  }
  cached = { key, state }
  return state
}

function write(state: UserTestState) {
  const key = storageKey()
  cached = { key, state }
  if (!key) return
  memoryStates.set(key, state)
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // Kept in memory for this page only.
  }
}

const listeners = new Set<() => void>()
function emit() {
  for (const listener of listeners) listener()
}

/** Changes the signed-in tester's state. Does nothing without a participant. */
export function update(change: (state: UserTestState) => UserTestState) {
  if (storageKey() === null) return
  write(change(read()))
  emit()
}

export function getUserTestState(): UserTestState {
  return read()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Another tab of the same tester changed the stored state.
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey()) {
      cached = null
      listener()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function useUserTestState(): UserTestState {
  return useSyncExternalStore(subscribe, read, read)
}

// ---------------------------------------------------------------------------------------------
// Mode

/** The browse mode: example data, and no service requests (profiles, recommendations, chat). */
export function isUserTestDemo() {
  return isUserTestEnabled() && read().mode === 'demo'
}

export function setExperienceMode(mode: ExperienceMode) {
  update((state) => ({ ...state, mode }))
}

export function markOnboardingCompleted() {
  update((state) => ({ ...state, onboardingCompleted: true }))
}

export function markSurveyCompleted() {
  update((state) => ({ ...state, surveyCompleted: true }))
}

/** Clears every tester's state of this cohort in tests. */
export function resetUserTestForTests() {
  memoryParticipant = null
  memoryStates.clear()
  cached = null
  try {
    sessionStorage.removeItem(PARTICIPANT_KEY)
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key?.startsWith('bokjak-user-test:')) localStorage.removeItem(key)
    }
  } catch {
    // Nothing was stored.
  }
  emit()
}
