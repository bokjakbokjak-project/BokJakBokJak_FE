import { useNavigate } from 'react-router'
import { isUserTestEnabled } from '../../lib/userTest/config'
import { DEMO_NOTICE } from '../../lib/userTest/experience'
import { DEMO_ENTRY_ROUTE } from '../../lib/userTest/routes'
import { useStartLiveSurvey } from '../../lib/userTest/useStartLiveSurvey'
import {
  getParticipantId,
  setExperienceMode,
  useUserTestState,
} from '../../lib/userTest/userTestStore'
import TestPill from './TestPill'

/**
 * The mode switch at the top of every service screen, in the 47px status area of the frame
 * (user test only, not in Figma).
 *
 * - Browse mode: the notice and `직접 설문하고 매칭하기`, which opens the priority step of the
 *   real survey.
 * - Real mode: a small `예시로 둘러보기`, so a tester who finished the survey (and so never sees
 *   the start screen again) can still browse the examples (requested 2026-11-20).
 */
export default function DemoBanner() {
  const navigate = useNavigate()
  const { mode } = useUserTestState()
  const startLiveSurvey = useStartLiveSurvey()
  // Without a signed-in tester there is no state to switch, so nothing shows.
  if (!isUserTestEnabled() || getParticipantId() === null) return null

  return (
    <div
      role="note"
      className="pointer-events-none fixed inset-x-0 top-[max(3px,env(safe-area-inset-top))] z-30 flex justify-center px-3"
    >
      {mode === 'demo' ? (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-brand-brown1 py-[5px] pr-[5px] pl-3 text-[11px] leading-[1.4] font-medium text-white shadow-[0_3px_10px_rgba(97,71,53,0.35)] ring-2 ring-white">
          <p className="break-keep">{DEMO_NOTICE}</p>
          <button
            type="button"
            className="shrink-0 rounded-full bg-roommate-pink px-2.5 py-[3px] text-[11px] leading-[1.4] font-bold whitespace-nowrap text-brand-brown1 transition-transform active:scale-95"
            onClick={() => void startLiveSurvey()}
          >
            직접 설문하고 매칭하기
          </button>
        </div>
      ) : (
        <TestPill
          className="mt-1"
          onClick={() => {
            setExperienceMode('demo')
            navigate(DEMO_ENTRY_ROUTE)
          }}
        >
          예시로 둘러보기
        </TestPill>
      )}
    </div>
  )
}
