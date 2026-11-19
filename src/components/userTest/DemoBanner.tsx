import { useNavigate } from 'react-router'
import { isUserTestEnabled } from '../../lib/userTest/config'
import { DEMO_NOTICE } from '../../lib/userTest/experience'
import { DEMO_ENTRY_ROUTE, liveEntryRoute } from '../../lib/userTest/routes'
import {
  getParticipantId,
  getUserTestState,
  setExperienceMode,
  useUserTestState,
} from '../../lib/userTest/userTestStore'

/**
 * The mode switch at the top of every service screen, in the 47px status area of the frame
 * (user test only, not in Figma).
 *
 * - Browse mode: the notice and `직접 설문하고 매칭하기`, which picks up the real flow where the
 *   tester left it.
 * - Real mode: a small `예시로 둘러보기`, so a tester who finished the survey (and so never sees
 *   the start screen again) can still browse the examples (requested 2026-11-20).
 */
export default function DemoBanner() {
  const navigate = useNavigate()
  const { mode } = useUserTestState()
  // Without a signed-in tester there is no state to switch, so nothing shows.
  if (!isUserTestEnabled() || getParticipantId() === null) return null

  return (
    <div
      role="note"
      className="pointer-events-none fixed inset-x-0 top-[max(3px,env(safe-area-inset-top))] z-30 flex justify-center px-3"
    >
      {mode === 'demo' ? (
        <div className="pointer-events-auto flex flex-col items-center rounded-[10px] bg-brand-brown1/90 px-3 py-[3px] text-center text-[11px] leading-[1.4] font-medium text-white">
          <p>{DEMO_NOTICE}</p>
          <button
            type="button"
            className="font-bold underline underline-offset-2"
            onClick={() => {
              setExperienceMode('live')
              navigate(liveEntryRoute(getUserTestState()))
            }}
          >
            직접 설문하고 매칭하기
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="pointer-events-auto mt-1.5 rounded-full border border-brand-brown3 bg-white/90 px-3 py-1 text-[11px] leading-[1.4] font-semibold text-brand-brown3"
          onClick={() => {
            setExperienceMode('demo')
            navigate(DEMO_ENTRY_ROUTE)
          }}
        >
          예시로 둘러보기
        </button>
      )}
    </div>
  )
}
