import { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import logo from '../../assets/onboarding/logo.svg'
import { isExperienceMode } from '../../lib/experience/mode'
import {
  restartAttempt,
  startNewParticipant,
  updateExperienceSession,
  useExperienceSession,
  type ExperiencePurpose,
} from '../../lib/experience/session'
import { useExperienceSetup } from '../../lib/experience/useExperienceSetup'

/**
 * The experience start (`/experience`, 요청서 3, 4.3). No sign-in: the basic information is the
 * shared experience setting, and the participant goes straight to their own priorities. The
 * results are examples, and the screen says so before it starts.
 */
export default function ExperienceStartPage() {
  const session = useExperienceSession()
  const { begin } = useExperienceSetup()
  const [params] = useSearchParams()
  const linkPurpose: ExperiencePurpose =
    params.get('purpose') === 'film' ? 'film' : 'booth'

  // The first visit in this browser opens a participant session; `?purpose=film` sets up the
  // filming run (scene jumps in the presenter menu, two agendas).
  useEffect(() => {
    if (!isExperienceMode()) return
    if (!session) startNewParticipant(linkPurpose)
    else if (params.has('purpose') && session.purpose !== linkPurpose) {
      updateExperienceSession((current) => ({
        ...current,
        purpose: linkPurpose,
      }))
    }
  }, [session, linkPurpose, params])

  if (!isExperienceMode()) return <Navigate to="/" replace />

  const start = () => {
    // A finished or half-done run of this participant starts over as a new attempt.
    if (session && (session.chat || session.matched || session.surveySkipped)) {
      restartAttempt()
    }
    begin()
  }

  // Only the heading and the start button, both centered (requested 2026-11-20).
  return (
    // The login screen's logo shows first, then the heading and the button (requested
    // 2026-11-20). Reduced motion shows everything at once.
    <main className="flex flex-1 flex-col items-center justify-center bg-brand-cream1 px-6 pt-[max(47px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))] text-center md:rounded-[24px]">
      <img
        src={logo}
        alt="복작복작"
        className="block h-[145px] w-[220px] max-w-none motion-safe:animate-fade-up"
      />
      <div className="mt-10 flex w-full flex-col items-center gap-10 motion-safe:animate-fade-up motion-safe:[animation-delay:900ms]">
        <h1 className="text-[22px] leading-[1.5] font-bold tracking-[0.44px] break-keep text-brand-brown1">
          로그인 없이 복작복작을
          <br />
          처음부터 끝까지 체험해 보세요
        </h1>
        <button
          type="button"
          onClick={start}
          className="flex h-[62px] w-full max-w-[342px] items-center justify-center rounded-[10px] bg-brand-brown1 text-[20px] leading-[1.5] font-semibold text-white"
        >
          체험 시작하기
        </button>
      </div>
    </main>
  )
}
