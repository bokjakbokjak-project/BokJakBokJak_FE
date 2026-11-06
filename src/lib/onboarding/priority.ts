import type { CategoryId } from './categories'

export const REQUIRED_PRIORITY_COUNT = 3

export type Rank = 1 | 2 | 3

/**
 * Priorities are ordered: index 0 is rank 1. They express matching importance, and the
 * character is derived from them. Weights are decided by the backend, not stored here.
 *
 * Deselecting pulls later ranks forward, and a fourth selection is ignored. These rules
 * are provisional until OPEN_QUESTIONS PL-3 is decided.
 */
export function togglePriority(
  priorities: readonly CategoryId[],
  id: CategoryId,
): CategoryId[] {
  if (priorities.includes(id)) {
    return priorities.filter((item) => item !== id)
  }
  if (priorities.length >= REQUIRED_PRIORITY_COUNT) {
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
  return priorities.length === REQUIRED_PRIORITY_COUNT
}
