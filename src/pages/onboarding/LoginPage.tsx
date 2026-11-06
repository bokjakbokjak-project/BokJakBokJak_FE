import googleLogo from '../../assets/icons/google.svg'
import tooltipTail from '../../assets/icons/tooltip-tail.svg'
import EmojiText from '../../components/onboarding/EmojiText'
import { canUseTemporaryFlow } from '../../lib/onboarding/demoMode'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { useStepNavigation } from '../../lib/onboarding/useStepNavigation'

export default function LoginPage() {
  const go = useStepNavigation()

  // Replace with the real sign-in once the method is decided (OPEN_QUESTIONS BE-1).
  // Temporary shortcut for development and demo mode: it creates no token or auth state,
  // and other builds do nothing here.
  const handleSignIn = () => {
    if (canUseTemporaryFlow()) go(ONBOARDING_ROUTES.school)
  }

  return (
    <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col items-center pt-[max(0px,calc(315px-env(safe-area-inset-top)))]">
      <main className="relative -left-[0.5px] flex flex-col items-center">
        <h1 className="w-[193px] text-[48.208px] leading-[1.5] font-medium whitespace-nowrap text-brand-brown1">
          복작복작
        </h1>
        <p className="w-[215px] text-center text-[22px] leading-[1.5] font-semibold text-brand-brown1">
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
        <button
          type="button"
          className="flex h-[61px] w-full items-center justify-center rounded-[50px] border border-[#e0e0e9] bg-white min-[390px]:justify-start min-[390px]:px-[51px]"
          onClick={handleSignIn}
        >
          <img src={googleLogo} alt="" className="size-[23px] shrink-0" />
          <span className="ml-4 font-inter text-[20px] leading-5 font-medium whitespace-nowrap text-[#1d1c2b]">
            Sign up with Google
          </span>
        </button>
      </div>
    </div>
  )
}
