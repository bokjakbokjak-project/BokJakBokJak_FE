import { isServerMode } from '../api/config'
import type { CategoryId } from '../onboarding/categories'
import { isUserTestDemo } from './userTestStore'

/**
 * Whether the service screens (home, roommates, chat, notifications) read the server. The user
 * test's browse mode keeps the sign-in on the server but gives these screens the sample data
 * instead, so browsing sends no profile, recommendation or chat request (requested 2026-11-17).
 * Every such screen asks here instead of `isServerMode()`.
 */
export function usesServerData() {
  return isServerMode() && !isUserTestDemo()
}

/** The browse mode's home character: an example, like the sample candidates. */
export const DEMO_PRIORITIES: readonly CategoryId[] = [
  'sleep-habit',
  'cleaning',
  'smoking',
]

export const DEMO_NOTICE = '둘러보기 모드예요. 프로필과 매칭률은 예시입니다.'
export const DEMO_REQUEST_NOTICE =
  '체험용 동작이며 실제 신청은 전송되지 않아요.'
