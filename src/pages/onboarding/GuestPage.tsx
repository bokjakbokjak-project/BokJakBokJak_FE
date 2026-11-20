import { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHeader from '../../components/my/ProfileHeader'
import { Field, TextInput } from '../../components/onboarding/Field'
import { isApiError } from '../../lib/api/apiError'
import { isServerMode } from '../../lib/api/config'
import { errorText } from '../../lib/api/errorText'
import { useAuth } from '../../lib/auth/authState'
import { useStartRouteRedirect } from '../../lib/auth/useStartRouteRedirect'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { checkNickname } from '../../lib/profile/profileApi'

const LENGTH_MESSAGE = '이름은 1~20자로 입력해주세요.'

function guestErrorText(error: unknown) {
  if (isApiError(error)) {
    // The server's nickname rule also refuses line breaks and invisible characters.
    if (error.code === 'INVALID_NICKNAME') {
      return '이름은 1~20자로, 줄바꿈이나 보이지 않는 문자 없이 입력해주세요.'
    }
    // 404: GUEST_LOGIN_ENABLED=false. 401: a server without the API answers an unknown public
    // path so (production before the backend release); this request sends no token, so a 401
    // can only mean that 체험하기 is not there.
    if (error.status === 404 || error.status === 401) {
      return '지금은 체험하기를 사용할 수 없어요.'
    }
  }
  return errorText(error, '체험을 시작하지 못했어요. 다시 시도해주세요.')
}

/**
 * 체험하기 (judges and demo visitors without a supported school Google account): a name, then
 * POST /api/auth/guest-login. Figma has no frame for this step, so it reuses the nickname frame
 * (1536:20298): the header, the character, one field and the bottom button. The name follows the
 * nickname rule (1-20 characters after trimming) and may repeat; each start is a new account.
 *
 * After the sign-in the screen moves on like the login screen (useStartRouteRedirect): the status
 * says SURVEY, and the survey sends a user without priorities to the priority step first.
 */
export default function GuestPage() {
  return isServerMode() ? (
    <GuestSignIn />
  ) : (
    // Needs the server; sample mode has no 체험하기 button.
    <Navigate to={ONBOARDING_ROUTES.login} replace />
  )
}

function GuestSignIn() {
  const navigate = useNavigate()
  const { signInAsGuest, isSigningIn } = useAuth()
  const isResolving = useStartRouteRedirect()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const isStartingRef = useRef(false)
  const check = checkNickname(value)

  const start = async () => {
    if (!check.ok || isStartingRef.current || isResolving || isSigningIn) {
      return
    }
    isStartingRef.current = true
    setIsStarting(true)
    setError(null)
    try {
      // The sign-in remounts this screen with the new session; the redirect hook moves on.
      await signInAsGuest(check.nickname)
    } catch (caught) {
      setError(guestErrorText(caught))
      isStartingRef.current = false
      setIsStarting(false)
    }
  }

  // Too long is said at once. Blank only disables the button, as on the nickname screen.
  const message =
    error ?? (!check.ok && value.trim().length > 0 ? LENGTH_MESSAGE : null)
  // Also while a Google sign-in started on the login screen is still out.
  const isBusy = isStarting || isResolving || isSigningIn

  return (
    <form
      className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex h-dvh flex-col overflow-hidden bg-brand-cream1 md:h-[844px]"
      onSubmit={(event) => {
        event.preventDefault()
        void start()
      }}
    >
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pt-[max(47px,env(safe-area-inset-top))]">
        <ProfileHeader
          title="체험하기"
          onBack={() => navigate(ONBOARDING_ROUTES.login, { replace: true })}
        />
        <main className="flex flex-col">
          <div className="mt-[17.79px]">
            <ProfileAvatar
              priorities={[]}
              frame="rounded-[35.208px] bg-card-avatar"
              strokeOutside
            />
          </div>
          <div className="mt-[35.79px] px-6 pb-6">
            <Field label="이름" htmlFor="guest-name">
              <TextInput
                id="guest-name"
                value={value}
                placeholder="이름을 입력해주세요"
                aria-invalid={message ? true : undefined}
                aria-describedby={message ? 'guest-name-message' : undefined}
                onChange={(next) => {
                  setValue(next)
                  setError(null)
                }}
              />
            </Field>
            {/* Not in Figma: one line under the field, in the nickname screen's style. */}
            {message && (
              <p
                id="guest-name-message"
                role="alert"
                className="mt-[5px] text-[13px] leading-[1.5] text-gray-500"
              >
                {message}
              </p>
            )}
          </div>
        </main>
      </div>
      <button
        type="submit"
        disabled={!check.ok || isBusy}
        aria-busy={isBusy || undefined}
        className="h-[calc(63px+env(safe-area-inset-bottom))] w-full shrink-0 rounded-t-[6px] bg-brand-brown1 pt-4 pb-[env(safe-area-inset-bottom)] text-[18px] leading-[1.5] font-bold text-white disabled:bg-brand-beige3 disabled:text-gray-400"
      >
        <span className="block h-[47px]">
          {isBusy ? '시작하는 중...' : '체험 시작하기'}
        </span>
      </button>
    </form>
  )
}
