import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
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
import { routeForNextStep } from '../../lib/auth/nextStep'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
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
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const clientId = getGoogleClientId()
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
      if (isSigningIn.current) return
      isSigningIn.current = true
      setPhase('signing-in')
      setError(null)
      try {
        const result = await signIn(credential)
        navigate(routeForNextStep(result.nextStep), { replace: true })
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
        // English, as the Figma button reads `Sign up with Google`.
        google.renderButton(slot, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signup_with',
          shape: 'pill',
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
  }, [clientId, navigate, signIn])

  return (
    <LoginLayout
      googleButton={
        // Keeps the Figma button's 61px row, so nothing around it moves while Google loads.
        <div
          ref={buttonRef}
          data-testid="google-signin-button"
          aria-busy={phase === 'loading' || phase === 'signing-in' || undefined}
          className={`flex h-[61px] w-full items-center justify-center ${
            phase === 'ready' ? '' : 'pointer-events-none'
          }`}
        />
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
  error?: string | null
}

function LoginLayout({ onPress, googleButton, error }: LoginLayoutProps) {
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
      <div className="mt-auto flex w-full flex-col items-center pt-6 pr-[27px] pb-[max(0px,calc(76px-env(safe-area-inset-bottom)))] pl-7">
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
        <div className="relative w-full">
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
          {/* Not in Figma: shown below the button without moving the layout. */}
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
