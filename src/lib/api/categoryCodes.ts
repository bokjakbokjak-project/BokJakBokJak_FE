import type { CategoryId } from '../onboarding/categories'

/**
 * Server category codes to the app's categories. Swagger has no enum for them, so this follows
 * the spec examples (SMOKING, CLEANING, PERSONAL_HYGIENE, SLEEP_SCHEDULE, SLEEP_HABITS) and is
 * still to be confirmed with the backend (roommate OPEN_QUESTIONS RM-8). An unknown code is left
 * out, so that rank falls back to the default character part instead of a wrong one.
 */
const CATEGORY_BY_CODE: Readonly<Record<string, CategoryId>> = {
  SLEEP_HABITS: 'sleep-habit',
  SLEEP_SCHEDULE: 'wake-alarm',
  CLEANING: 'cleaning',
  PERSONAL_HYGIENE: 'personal-hygiene',
  SMOKING: 'smoking',
}

/**
 * The top three codes in rank order to the character parts' categories. A rank whose code is
 * unknown stays empty (`undefined`), so the next ranks keep their own part.
 */
export function categoriesFromCodes(
  codes: readonly string[],
): (CategoryId | undefined)[] {
  return codes.slice(0, 3).map((code) => CATEGORY_BY_CODE[code])
}
