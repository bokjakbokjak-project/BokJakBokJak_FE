/**
 * Connection point for sending the answers and building the profile after the survey. It is
 * null while there is no API (OPEN_QUESTIONS BE-9), so the loading screen only waits for its
 * minimum time. When the API exists, set it to a function that resolves once the profile is
 * ready and rejects on failure. The loading screen then waits for it as well.
 */
export const createSurveyProfile: (() => Promise<void>) | null = null
