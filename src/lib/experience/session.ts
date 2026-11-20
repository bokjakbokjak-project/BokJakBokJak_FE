import { useSyncExternalStore } from 'react'
import type { CategoryId } from '../onboarding/categories'
import { getUserTestCohort, isUserTestEnabled } from '../userTest/config'
import { getParticipantId } from '../userTest/userTestStore'
import type { ExperienceChatState } from './chatMachine'
import { isExperienceMode } from './mode'

/**
 * One experience session: the scripted chat and whether it ended in a match, shared by the
 * roommate screens, the chat and the home (so the home shows the match the chat finished).
 * Nothing here is sent to the server or saved as a real match.
 *
 * - The experience mode keeps it under a local session id (`demoSessionId`), never a user id.
 *   A reload keeps the session; `다음 참가자` starts a new one, and `처음부터` a new attempt of it.
 * - The user test (service mode, signed-in tester) keeps it per cohort and tester, so a chat
 *   there, which never reaches the real candidate, belongs to that tester only.
 */
export type ExperiencePurpose = 'booth' | 'film'

export type ExperienceSession = {
  id: string
  purpose: ExperiencePurpose
  /** Raised by `처음부터`, so a research log can tell the attempts apart. */
  attempt: number
  /** The experience's own priorities and answers, kept so a reload can put them back. */
  priorities: CategoryId[]
  answers: Record<number, string>
  /** True once the survey was filled with example answers, so the result says so. */
  surveySkipped: boolean
  chat: ExperienceChatState | null
  /** The partner of a finished experience match. */
  matched: { name: string } | null
}

const LOCAL_SCOPE_KEY = 'bokjak-experience-session'
const SCENARIO_VERSION = 'v1'

/** Where this session is kept, or null when neither the experience nor the user test applies. */
function storageKey(): string | null {
  if (isExperienceMode()) {
    const id = currentLocalId()
    return id ? `bokjak-experience:${SCENARIO_VERSION}:local:${id}` : null
  }
  if (isUserTestEnabled()) {
    const participant = getParticipantId()
    const cohort = getUserTestCohort()
    return participant !== null && cohort
      ? `bokjak-experience:${SCENARIO_VERSION}:test:${cohort}:${participant}`
      : null
  }
  return null
}

function currentLocalId(): string | null {
  try {
    return localStorage.getItem(LOCAL_SCOPE_KEY)
  } catch {
    return null
  }
}

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function emptySession(
  purpose: ExperiencePurpose,
  id = newId(),
): ExperienceSession {
  return {
    id,
    purpose,
    attempt: 1,
    priorities: [],
    answers: {},
    surveySkipped: false,
    chat: null,
    matched: null,
  }
}

// Memory copy, so the screens read one object between writes and storage can fail quietly.
let cache: { key: string; session: ExperienceSession } | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

function load(key: string): ExperienceSession | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const value = JSON.parse(raw) as ExperienceSession
    if (typeof value?.id !== 'string') return null
    // Sessions kept before a field existed get its empty value.
    return { ...emptySession(value.purpose ?? 'booth', value.id), ...value }
  } catch {
    return null
  }
}

export function getExperienceSession(): ExperienceSession | null {
  const key = storageKey()
  if (!key) return null
  if (cache?.key !== key) {
    cache = { key, session: load(key) ?? emptySession('booth') }
  }
  return cache.session
}

function save(session: ExperienceSession) {
  const key = storageKey()
  if (!key) return
  cache = { key, session }
  try {
    localStorage.setItem(key, JSON.stringify(session))
  } catch {
    // Kept in memory for this page only.
  }
  emit()
}

export function updateExperienceSession(
  change: (session: ExperienceSession) => ExperienceSession,
) {
  const session = getExperienceSession()
  if (session) save(change(session))
}

/**
 * `다음 참가자` (and the start of the experience): a new local session, so the next person sees
 * none of the previous answers, messages or match. The previous session stays in storage.
 */
export function startNewParticipant(purpose: ExperiencePurpose) {
  const id = newId()
  try {
    localStorage.setItem(LOCAL_SCOPE_KEY, id)
  } catch {
    // The memory copy below still serves this page.
  }
  cache = null
  save(emptySession(purpose, id))
}

/** `처음부터`: the same session from the beginning, as a new attempt. */
export function restartAttempt() {
  updateExperienceSession((session) => ({
    ...session,
    attempt: session.attempt + 1,
    priorities: [],
    answers: {},
    surveySkipped: false,
    chat: null,
    matched: null,
  }))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useExperienceSession() {
  return useSyncExternalStore(
    subscribe,
    getExperienceSession,
    getExperienceSession,
  )
}

/** For tests: forgets the memory copy. */
export function resetExperienceSessionCacheForTests() {
  cache = null
}
