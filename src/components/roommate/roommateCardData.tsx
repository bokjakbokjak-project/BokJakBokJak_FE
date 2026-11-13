import type { ReactNode } from 'react'
import type { RoommateCandidate } from '../../lib/roommate/roommateData'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

export type RoommateCardData = {
  /** The match analysis of this candidate. */
  to: string
  name: string
  age: number | null
  department: string
  /** Null is a server score that could not be counted, shown as `정보 부족`. */
  matchRate: number | null
  /** Drawn in the 50px slot. Its image may spill over the slot for its outline. */
  avatar: ReactNode
}

/** A sample candidate's card, with the exported character that includes its outline and shadow. */
export function sampleRoommateCard(
  candidate: RoommateCandidate,
): RoommateCardData {
  return {
    to: ROOMMATE_ROUTES.analysis(candidate.id),
    name: candidate.name,
    age: candidate.age,
    department: candidate.department,
    matchRate: candidate.matchRate,
    avatar: (
      <img
        src={candidate.avatar}
        alt=""
        className="absolute top-[-5.2%] left-[-5.2%] size-[112.5%] max-w-none rounded-[15.7%]"
      />
    ),
  }
}
