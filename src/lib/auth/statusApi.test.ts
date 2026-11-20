import { describe, expect, it } from 'vitest'
import { parseMyStatus } from './statusApi'

// The fields of the backend's MyStatusResponse (BE PR #72), in snake_case like the other APIs.
const data = {
  onboarding_completed: true,
  survey_completed: false,
  survey_update_required: true,
  next_step: 'SURVEY',
  matched: true,
  matching_id: 7,
}

describe('GET /api/me/status', () => {
  it('reads every field', () => {
    expect(parseMyStatus(data)).toEqual({
      onboardingCompleted: true,
      surveyCompleted: false,
      surveyUpdateRequired: true,
      nextStep: 'SURVEY',
      matched: true,
      matchingId: 7,
    })
  })

  it('reads a missing or null matching_id as no match', () => {
    expect(parseMyStatus({ ...data, matching_id: null }).matchingId).toBeNull()
    const withoutId: Record<string, unknown> = { ...data }
    delete withoutId.matching_id
    expect(parseMyStatus(withoutId).matchingId).toBeNull()
  })

  it.each([
    ['an unknown next_step', { next_step: 'PROFILE' }],
    ['a missing flag', { survey_update_required: undefined }],
    ['a flag that is not a boolean', { matched: 'true' }],
    ['a matching_id that is not a whole number', { matching_id: 1.5 }],
  ])('refuses %s', (_, change) => {
    expect(() => parseMyStatus({ ...data, ...change })).toThrow()
  })

  it('refuses a body that is not an object', () => {
    expect(() => parseMyStatus(null)).toThrow()
    expect(() => parseMyStatus([])).toThrow()
  })
})
