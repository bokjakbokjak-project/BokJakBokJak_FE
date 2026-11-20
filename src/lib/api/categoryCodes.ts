import {
  CATEGORY_IDS,
  CATEGORY_SERVER_CODES,
  type CategoryId,
} from '../onboarding/categories'

/**
 * Server category codes to the app's categories, from the same table the survey save uses
 * (`CATEGORY_SERVER_CODES`), so a profile or recommendation reads every code the survey sends,
 * including `TEMPERATURE` (backend migration V11). Swagger has no enum for them (roommate
 * OPEN_QUESTIONS RM-8). An unknown code is left out, so that rank falls back to the default
 * character part instead of a wrong one.
 */
const CATEGORY_BY_CODE: Readonly<Record<string, CategoryId>> =
  Object.fromEntries(CATEGORY_IDS.map((id) => [CATEGORY_SERVER_CODES[id], id]))

/**
 * The top three codes in rank order to the character parts' categories. A rank whose code is
 * unknown stays empty (`undefined`), so the next ranks keep their own part.
 */
export function categoriesFromCodes(
  codes: readonly string[],
): (CategoryId | undefined)[] {
  return codes.slice(0, 3).map((code) => CATEGORY_BY_CODE[code])
}
