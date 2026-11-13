/**
 * Google Identity Services (GIS), loaded only when the server sign-in is used. It returns a
 * Google ID token (`credential`), which the backend verifies in POST /api/auth/login.
 * https://developers.google.com/identity/gsi/web/reference/js-reference
 */

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

type CredentialResponse = { credential?: string }

export type GoogleButtonOptions = {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: number
  locale?: string
}

export type GoogleAccountsId = {
  initialize: (config: {
    client_id: string
    callback: (response: CredentialResponse) => void
    ux_mode?: 'popup' | 'redirect'
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    context?: 'signin' | 'signup' | 'use'
  }) => void
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void
  prompt: () => void
  disableAutoSelect: () => void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } }
  }
}

let loading: Promise<GoogleAccountsId> | null = null

export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  const ready = window.google?.accounts?.id
  if (ready) return Promise.resolve(ready)

  loading ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.onload = () => {
      const api = window.google?.accounts?.id
      if (api) resolve(api)
      else reject(new Error('Google Identity Services is unavailable.'))
    }
    script.onerror = () => {
      // Allows a later attempt to load it again.
      script.remove()
      loading = null
      reject(new Error('Google Identity Services failed to load.'))
    }
    document.head.appendChild(script)
  })
  return loading
}

let initializedClientId: string | null = null
let credentialHandler: ((credential: string) => void) | null = null

/** Initializes GIS once per client ID. The callback goes to the screen that is showing now. */
export function initializeGoogleSignIn(
  api: GoogleAccountsId,
  clientId: string,
) {
  if (initializedClientId === clientId) return
  api.initialize({
    client_id: clientId,
    callback: ({ credential }) => {
      if (credential) credentialHandler?.(credential)
    },
    ux_mode: 'popup',
    auto_select: false,
    cancel_on_tap_outside: true,
    context: 'signin',
  })
  initializedClientId = clientId
}

export function setCredentialHandler(handler: (credential: string) => void) {
  credentialHandler = handler
  return () => {
    if (credentialHandler === handler) credentialHandler = null
  }
}

/** After sign-out, so Google does not pick the same account automatically next time. */
export function disableGoogleAutoSelect() {
  window.google?.accounts?.id?.disableAutoSelect()
}

export function resetGoogleIdentityForTests() {
  loading = null
  initializedClientId = null
  credentialHandler = null
}
