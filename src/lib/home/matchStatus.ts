export type MatchStatus = 'before' | 'matched'

/**
 * There is no mutual matching API yet, so the home always starts before a match. Viewing a
 * candidate must not change this. Replace this with the API value when it exists.
 */
export function getMatchStatus(): MatchStatus {
  return 'before'
}
