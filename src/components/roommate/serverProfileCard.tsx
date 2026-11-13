import type { CategoryId } from '../../lib/onboarding/categories'
import CharacterAvatar from './CharacterAvatar'
import type { ProfileCardData } from './ProfileCard'

/**
 * A server user's profile card on the analysis and the detail profile. Its character comes from
 * the user's top three categories. A null score reads `정보 부족`; leaving `matchRate` out drops
 * the ring.
 */
export function serverProfileCard(
  user: {
    nickname: string
    age: number | null
    department: string
    priorities: readonly (CategoryId | undefined)[]
  },
  matchRate?: number | null,
): ProfileCardData {
  return {
    name: user.nickname,
    age: user.age,
    department: user.department,
    matchRate,
    matchRateNull: 'insufficient',
    avatar: <CharacterAvatar priorities={user.priorities} />,
  }
}
