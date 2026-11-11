import type { RoommateCandidate } from '../../lib/roommate/roommateData'
import type { ProfileCardData } from './ProfileCard'

/** A candidate's card, with the exported character that includes its outline and shadow. */
export function candidateCard(candidate: RoommateCandidate): ProfileCardData {
  return {
    name: candidate.name,
    age: candidate.age,
    department: candidate.department,
    matchRate: candidate.matchRate,
    avatar: (
      <img
        src={candidate.avatar}
        alt=""
        className="absolute top-[-6.5%] left-[-6%] size-[112.5%] max-w-none rounded-[15.7%]"
      />
    ),
  }
}
