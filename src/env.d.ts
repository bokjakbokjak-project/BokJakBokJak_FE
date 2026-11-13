interface ImportMetaEnv {
  /** `server` connects to the backend. Anything else keeps the in-memory sample flow. */
  readonly VITE_API_MODE?: string
  /** Backend origin, such as https://example.com. Used only when VITE_API_MODE is `server`. */
  readonly VITE_API_BASE_URL?: string
  /** Google Identity Services client ID. A public value, not a secret. */
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_DEMO_MODE?: string
  readonly VITE_VERCEL_ENV?: string
}
