import { isServerMode } from '../api/config'
import type { Gender } from '../onboarding/onboardingState'

/**
 * The user test build (requested 2026-11-17). Off by default; a test deployment turns it on with
 * `VITE_USER_TEST=true` and a cohort id. The flag only switches the screens: it is public, so it
 * grants nothing. Keeping test data apart is the server's job (see docs/user-test/).
 *
 * It needs the server flow, since the test starts with the real Google sign-in.
 */
export function isUserTestEnabled() {
  return (
    import.meta.env.VITE_USER_TEST === 'true' &&
    isServerMode() &&
    getUserTestCohort() !== null
  )
}

/** The test round, such as `local-2026-11`. Answers and state are kept per cohort. */
export function getUserTestCohort(): string | null {
  const cohort = import.meta.env.VITE_USER_TEST_COHORT?.trim()
  return cohort && /^[A-Za-z0-9_-]{1,40}$/.test(cohort) ? cohort : null
}

/**
 * The shared basic information every tester gets instead of typing their own. The values are
 * not decided yet (the request leaves them to the test setup), so they come from the test
 * deployment's settings and are never guessed from the tester.
 */
export type TestProfileValues = {
  gender: Gender
  birthYear: number
  department: string
  studentNumber: string
  dormitory: string
}

export type TestProfileConfig =
  | { status: 'ready'; values: TestProfileValues }
  /** Lists the settings that are missing or invalid, by variable name. */
  | { status: 'missing'; problems: string[] }

export function getTestProfileConfig(): TestProfileConfig {
  const env = import.meta.env
  const problems: string[] = []

  const genderText = env.VITE_USER_TEST_GENDER?.trim().toUpperCase()
  const gender: Gender | null =
    genderText === 'FEMALE' ? 'female' : genderText === 'MALE' ? 'male' : null
  if (!gender) problems.push('VITE_USER_TEST_GENDER (FEMALE 또는 MALE)')

  const year = Number(env.VITE_USER_TEST_BIRTH_YEAR)
  const thisYear = new Date().getFullYear()
  const birthYear =
    Number.isInteger(year) && year >= thisYear - 100 && year <= thisYear
      ? year
      : null
  if (birthYear === null) problems.push('VITE_USER_TEST_BIRTH_YEAR')

  const department = env.VITE_USER_TEST_DEPARTMENT?.trim() ?? ''
  if (!department) problems.push('VITE_USER_TEST_DEPARTMENT')
  const studentNumber = env.VITE_USER_TEST_STUDENT_NUMBER?.trim() ?? ''
  if (!studentNumber) problems.push('VITE_USER_TEST_STUDENT_NUMBER')
  const dormitory = env.VITE_USER_TEST_DORMITORY?.trim() ?? ''
  if (!dormitory) problems.push('VITE_USER_TEST_DORMITORY')

  if (problems.length > 0 || !gender || birthYear === null) {
    return { status: 'missing', problems }
  }
  return {
    status: 'ready',
    values: { gender, birthYear, department, studentNumber, dormitory },
  }
}

/**
 * The anonymous name, `테스터012`. It comes from the server's user id, so every tester gets a
 * different one without asking the server for a name.
 */
export function testerName(participantId: number) {
  return `테스터${String(participantId).padStart(3, '0')}`
}

/**
 * Whether feedback is sent to the server. The collection API does not exist yet (the proposed
 * contract is docs/user-test/backend-contract.md), so it stays off and answers are kept on the
 * device, marked as not collected.
 */
export function isFeedbackApiEnabled() {
  return import.meta.env.VITE_USER_TEST_FEEDBACK_API === 'on'
}
