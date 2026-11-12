import { CATEGORY_IDS, type CategoryId } from './categories'

/**
 * Decided on 2026-11-09 and kept by the project owner on 2026-11-13 (QA 3): at least three
 * priorities, up to all five categories. Only ranks 1-3 change the character.
 */
export const MIN_PRIORITY_COUNT = 3
export const MAX_PRIORITY_COUNT = CATEGORY_IDS.length
/** Ranks that change the character's head, hand and body. */
export const CHARACTER_RANK_COUNT = 3

export type Rank = 1 | 2 | 3 | 4 | 5

/**
 * Priorities are ordered: index 0 is rank 1. They express matching importance. Only ranks 1-3
 * change the character (see `getPartVariants`); ranks 4 and 5 are kept for matching only.
 * Weights are decided by the backend, not stored here.
 *
 * Deselecting pulls later ranks forward. That rule is still provisional (OPEN_QUESTIONS PL-3).
 */
export function togglePriority(
  priorities: readonly CategoryId[],
  id: CategoryId,
): CategoryId[] {
  if (priorities.includes(id)) {
    return priorities.filter((item) => item !== id)
  }
  if (priorities.length >= MAX_PRIORITY_COUNT) {
    return [...priorities]
  }
  return [...priorities, id]
}

export function getRank(
  priorities: readonly CategoryId[],
  id: CategoryId,
): Rank | null {
  const index = priorities.indexOf(id)
  return index === -1 ? null : ((index + 1) as Rank)
}

export function isPriorityComplete(priorities: readonly CategoryId[]) {
  return (
    priorities.length >= MIN_PRIORITY_COUNT &&
    priorities.length <= MAX_PRIORITY_COUNT
  )
}
