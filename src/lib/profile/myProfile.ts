import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { isApiError } from '../api/apiError'
import { isServerMode } from '../api/config'
import { getSessionGeneration } from '../auth/tokenStore'
import { useOnboarding } from '../onboarding/onboardingState'
import { fetchMyProfile, type MyProfile } from './profileApi'

/**
 * The signed-in user's profile (GET /api/me/profile), read once per session and shared by the my
 * page, the nickname screen, the survey result and the home greeting, so they always agree. A new
 * session (another account, a sign-out) starts over. A survey save marks it stale, because the
 * answers and the top categories change; a nickname save updates it in place.
 */
export type MyProfileState =
  | { status: 'idle' }
  | { status: 'loading' }
  /** 409 SURVEY_REQUIRED: a normal state before the first survey, not a failure. */
  | { status: 'survey-required' }
  | { status: 'failed'; error: unknown }
  | { status: 'ready'; profile: MyProfile }

/**
 * `version` goes up whenever the server's profile changes in this session (a nickname or survey
 * save). A read that started before such a change is dropped and read again, so an older answer
 * can never replace a newer save.
 */
let store: {
  generation: number
  state: MyProfileState
  stale: boolean
  version: number
} = {
  generation: -1,
  state: { status: 'idle' },
  stale: false,
  version: 0,
}
const listeners = new Set<() => void>()

function current() {
  const generation = getSessionGeneration()
  if (store.generation !== generation) {
    store = { generation, state: { status: 'idle' }, stale: false, version: 0 }
  }
  return store
}

function setState(generation: number, state: MyProfileState, stale = false) {
  // A late answer for an earlier session never reaches the new one.
  const { generation: now, version } = current()
  if (now !== generation) return
  store = { generation, state, stale, version }
  for (const listener of [...listeners]) listener()
}

let inFlight: { generation: number; promise: Promise<void> } | null = null

/** Reads the profile unless it is already loaded and fresh, or a read is under way. */
export function loadMyProfile(): Promise<void> {
  const { generation, state, stale, version } = current()
  if (inFlight?.generation === generation) return inFlight.promise
  // Before the first survey the answer is 409 every time, so it is not asked again until a
  // survey save marks it stale. A failure can be retried.
  if (
    (state.status === 'ready' || state.status === 'survey-required') &&
    !stale
  ) {
    return Promise.resolve()
  }
  // A stale profile is not shown while it is read again: the result screen right after a survey
  // save must not show the previous answers for a moment.
  setState(generation, { status: 'loading' })
  const entry = { generation, promise: Promise.resolve() }
  const settle = (next: MyProfileState) => {
    if (inFlight === entry) inFlight = null
    // Changed on the server after this read started: drop it and read again.
    if (current().generation === generation && current().version !== version) {
      return loadMyProfile()
    }
    setState(generation, next)
  }
  entry.promise = fetchMyProfile().then(
    (profile) => settle({ status: 'ready', profile }),
    (error: unknown) =>
      settle(
        isApiError(error) && error.code === 'SURVEY_REQUIRED'
          ? { status: 'survey-required' }
          : { status: 'failed', error },
      ),
  )
  inFlight = entry
  return entry.promise
}

/** After a survey save: the profile is read again when next needed, or now if a read is out. */
export function markMyProfileStale() {
  const store = current()
  store.stale = true
  store.version += 1
}

/**
 * After a nickname save: shows the saved nickname everywhere and keeps the rest of the profile.
 * A read still out when the save succeeded is dropped and read again, so it cannot bring back
 * the previous nickname.
 */
export function setMyNickname(generation: number, nickname: string) {
  const store = current()
  if (store.generation !== generation) return
  store.version += 1
  const { state } = store
  if (state.status === 'ready') {
    setState(generation, {
      status: 'ready',
      profile: { ...state.profile, nickname },
    })
  } else {
    store.stale = true
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const snapshot = () => current().state

/** Server mode: the profile, read when first needed. Sample mode: always `idle`, nothing is sent. */
export function useMyProfile() {
  const state = useSyncExternalStore(subscribe, snapshot, snapshot)
  const isServer = isServerMode()

  useEffect(() => {
    if (isServer) void loadMyProfile()
  }, [isServer])

  const retry = useCallback(() => {
    void loadMyProfile()
  }, [])

  return { state: isServer ? state : ({ status: 'idle' } as const), retry }
}

/**
 * The name and character the screens show for the signed-in user. Server mode: the profile's
 * nickname and top three categories once read (before the first survey there is no profile, so
 * the onboarding answers of this session are used). Sample mode: the onboarding answers in
 * memory, as before. While the profile is read the name stays empty instead of flashing `사용자`.
 */
export function useDisplayProfile() {
  const { data } = useOnboarding()
  const { state, retry } = useMyProfile()
  const profile = state.status === 'ready' ? state.profile : null
  const fallbackName =
    data.name.trim() || (state.status === 'loading' ? '' : '사용자')
  return {
    state,
    retry,
    name: profile?.nickname ?? fallbackName,
    priorities: profile ? profile.topCategories : data.priorities,
  }
}
