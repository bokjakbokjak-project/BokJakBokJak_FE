import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import googleLogo from '../../assets/icons/google.svg'
import logo from '../../assets/onboarding/logo.svg'
import tooltipTail from '../../assets/icons/tooltip-tail.svg'
import EmojiText from '../../components/onboarding/EmojiText'
import { isApiError } from '../../lib/api/apiError'
import { getGoogleClientId, isServerMode } from '../../lib/api/config'
import { useAuth } from '../../lib/auth/authState'
import {
  initializeGoogleSignIn,
  loadGoogleIdentity,
  setCredentialHandler,
} from '../../lib/auth/googleIdentity'
import { useStartRouteRedirect } from '../../lib/auth/useStartRouteRedirect'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { userTestRouteAfterSignIn } from '../../lib/userTest/signIn'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

/** Google draws its button between 200px and 400px wide. */
const GOOGLE_BUTTON_MIN_WIDTH = 200
const GOOGLE_BUTTON_MAX_WIDTH = 400

const SDK_ERROR =
  'Google 로그인을 불러오지 못했어요. 새로고침 후 다시 시도해주세요.'
const CONFIG_ERROR = '로그인 설정을 확인할 수 없어요.'
const FALLBACK_ERROR = '로그인하지 못했어요. 다시 시도해주세요.'

export default function LoginPage() {
  return isServerMode() ? <ServerLogin /> : <SampleLogin />
}

/**
 * Sample mode, as before: the button only moves to the next step. It creates no token or auth
 * state.
 */
function SampleLogin() {
  const go = useStepNavigation()
  return <LoginLayout onPress={() => go(ONBOARDING_ROUTES.school)} />
}

type Phase = 'loading' | 'ready' | 'signing-in' | 'unavailable'

/**
 * Server mode. Google's own button (GIS) is drawn, visible, where the Figma button is. It used
 * to sit invisibly (opacity 0) over the Figma button, but Google ignores presses on a button it
 * cannot see: in Production a press opened nothing and POST /api/auth/login was never sent.
 * The One Tap prompt is no replacement for the button either, so it is not used. GIS returns an
 * ID token, which goes to POST /api/auth/login, and `next_step` picks the screen.
 * https://developers.google.com/identity/gsi/web/guides/display-button
 */
function ServerLogin() {
  const { signIn, isSigningIn: signInPending } = useAuth()
  const clientId = getGoogleClientId()
  // Both Google and guest sign-in use the shared redirect hook.
  const isResolving = useStartRouteRedirect()
  // Read by Google's callback, which outlives renders.
  const isResolvingRef = useRef(isResolving)
  useEffect(() => {
    isResolvingRef.current = isResolving
  }, [isResolving])
  const buttonRef = useRef<HTMLDivElement>(null)
  const isSigningIn = useRef(false)
  const [phase, setPhase] = useState<Phase>(
    clientId ? 'loading' : 'unavailable',
  )
  const [error, setError] = useState<string | null>(
    clientId ? null : CONFIG_ERROR,
  )

  useEffect(() => {
    if (!clientId) return
    let isCurrent = true

    const removeHandler = setCredentialHandler(async (credential) => {
      // Signed in already and moving on: a second sign-in would start another session.
      if (isSigningIn.current || isResolvingRef.current) return
      isSigningIn.current = true
      setPhase('signing-in')
      setError(null)
      try {
        // The sign-in remounts this screen with the new session; the effect above moves on.
        const result = await signIn(credential)
        // The user test records the tester for this session.
        userTestRouteAfterSignIn(result)
      } catch (signInError) {
        if (!isCurrent) return
        // The server's messages are written for users (Notion spec, POST /api/auth/login).
        setError(isApiError(signInError) ? signInError.message : FALLBACK_ERROR)
        setPhase('ready')
      } finally {
        isSigningIn.current = false
      }
    })

    loadGoogleIdentity().then(
      (google) => {
        const slot = buttonRef.current
        if (!isCurrent || !slot) return
        initializeGoogleSignIn(google, clientId)
        const width = Math.min(
          GOOGLE_BUTTON_MAX_WIDTH,
          Math.max(GOOGLE_BUTTON_MIN_WIDTH, Math.round(slot.offsetWidth)),
        )
        slot.replaceChildren()
        // As close to the Figma button (1036:26154) as GIS allows: white with a gray outline, a
        // pill, the full row width, `Sign up with Google` in English, and the logo next to the
        // text in the middle. GIS sets the height (40px at `large`), the font and the logo size,
        // and the button must stay visible and unscaled, or Google ignores presses on it.
        google.renderButton(slot, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          shape: 'pill',
          logo_alignment: 'center',
          width,
          locale: 'en',
        })
        setPhase('ready')
      },
      () => {
        if (!isCurrent) return
        setPhase('unavailable')
        setError(SDK_ERROR)
      },
    )

    return () => {
      isCurrent = false
      removeHandler()
    }
  }, [clientId, signIn])

  return (
    <LoginLayout
      googleButton={
        // Google's 40px button (GIS `large`), as wide as the row up to 400px. The row is that
        // height, so nothing around it moves while Google loads.
        <div
          ref={buttonRef}
          data-testid="google-signin-button"
          // Keyboard too, not only the pointer: nothing to press until the button can be used.
          inert={!(phase === 'ready' && !isResolving)}
          aria-busy={
            phase === 'loading' ||
            phase === 'signing-in' ||
            isResolving ||
            undefined
          }
          className={`flex h-10 w-full items-start justify-center ${
            phase === 'ready' && !isResolving ? '' : 'pointer-events-none'
          }`}
        />
      }
      guestButton={
        // 체험하기 (Figma 2708:21189): the brown pill under Google's button, 10px apart. Same
        // width and height as Google's button as rendered (40px, row width up to 400px), as
        // the designer asked, instead of the 61px of the Figma frame; GIS keeps its button
        // between 200px and 400px wide, and so does this one.
        <Link
          to={ONBOARDING_ROUTES.guest}
          // Not while a sign-in (Google's) is out or the screen is moving on.
          inert={isResolving || signInPending}
          aria-disabled={isResolving || signInPending || undefined}
          className={`mt-[10px] flex h-10 w-full max-w-[400px] min-w-[200px] items-center justify-center rounded-full bg-brand-brown1 text-[18px] leading-[1.5] font-semibold tracking-[-0.36px] whitespace-nowrap text-white ${
            isResolving || signInPending ? 'pointer-events-none' : ''
          }`}
        >
          지금 바로 체험하기 →
        </Link>
      }
      error={error}
    />
  )
}

type LoginLayoutProps = {
  /** Sample mode: the Figma button. */
  onPress?: () => void
  /** Server mode: Google's own button in place of the Figma button. */
  googleButton?: ReactNode
  /** Server mode: 체험하기 under Google's button. */
  guestButton?: ReactNode
  error?: string | null
}

function LoginLayout({
  onPress,
  googleButton,
  guestButton,
  error,
}: LoginLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col items-center pt-[max(0px,calc(277px-env(safe-area-inset-top)))]">
      <main className="flex flex-col items-center">
        <h1>
          <img
            src={logo}
            alt="복작복작"
            className="block h-[145px] w-[220px] max-w-none"
          />
        </h1>
        <p className="relative -left-[0.5px] mt-[12.08px] text-center text-[20px] leading-[1.5] font-semibold text-brand-brown1">
          상황으로 찾는 룸메이트
        </p>
      </main>
      {/* With 체험하기 the buttons end 44px above the bottom, as in Figma 1036:26146; without it
          (sample mode) the single button keeps its earlier 76px. */}
      <div
        className={`mt-auto flex w-full flex-col items-center pt-6 pr-[27px] pl-7 ${
          guestButton
            ? 'pb-[max(0px,calc(44px-env(safe-area-inset-bottom)))]'
            : 'pb-[max(0px,calc(76px-env(safe-area-inset-bottom)))]'
        }`}
      >
        <div className="relative mb-[17px] flex h-[31px] w-[159px] items-center justify-center rounded-[100px] bg-gray-black">
          <p className="text-[14px] leading-[1.5] font-medium whitespace-nowrap text-white">
            <EmojiText
              emoji="🔥"
              text="학교계정으로 시작해요"
              separator=""
              emojiWidthClassName="w-[14px]"
            />
          </p>
          <img
            src={tooltipTail}
            alt=""
            className="absolute top-[24px] left-[71px] h-[13px] w-[15px] max-w-none"
          />
        </div>
        <div className="relative flex w-full flex-col items-center">
          {googleButton ?? (
            <button
              type="button"
              className="flex h-[61px] w-full items-center justify-center rounded-[50px] border border-[#e0e0e9] bg-white min-[390px]:justify-start min-[390px]:px-[51px]"
              onClick={onPress}
            >
              <img src={googleLogo} alt="" className="size-[23px] shrink-0" />
              <span className="ml-4 font-inter text-[20px] leading-5 font-medium whitespace-nowrap text-[#1d1c2b]">
                Sign up with Google
              </span>
            </button>
          )}
          {guestButton}
          {/* Not in Figma: shown below the buttons without moving the layout. */}
          {error && (
            <p
              role="alert"
              className="absolute top-full right-0 left-0 mt-2 text-center text-[13px] leading-[1.5] text-gray-500"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
