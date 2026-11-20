interface ImportMetaEnv {
  /** `server` connects to the backend. Anything else keeps the in-memory sample flow. */
  readonly VITE_API_MODE?: string
  /** Backend origin, such as https://example.com. Used only when VITE_API_MODE is `server`. */
  readonly VITE_API_BASE_URL?: string
  /** Google Identity Services client ID. A public value, not a secret. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_DEMO_MODE?: string
  readonly VITE_VERCEL_ENV?: string
  /** `true` turns on the user test screens (src/lib/userTest/config.ts). Off by default. */
  readonly VITE_USER_TEST?: string
  /** The test round, such as `local-2026-11`. */
  readonly VITE_USER_TEST_COHORT?: string
  /** Shared test basic information: `FEMALE` or `MALE`. */
  readonly VITE_USER_TEST_GENDER?: string
  readonly VITE_USER_TEST_BIRTH_YEAR?: string
  readonly VITE_USER_TEST_DEPARTMENT?: string
  readonly VITE_USER_TEST_STUDENT_NUMBER?: string
  readonly VITE_USER_TEST_DORMITORY?: string
  /** `on` sends feedback to the proposed collection API. Off until the server has it. */
  readonly VITE_USER_TEST_FEEDBACK_API?: string
  /** `true` offers 핵심 체험 | 전체 서비스 (src/lib/experience/mode.ts). */
  readonly VITE_EXPERIENCE?: string
}
