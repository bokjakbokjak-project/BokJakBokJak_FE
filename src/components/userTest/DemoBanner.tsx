import { useNavigate } from 'react-router'
import { DEMO_NOTICE } from '../../lib/userTest/experience'
import { liveEntryRoute } from '../../lib/userTest/routes'
import {
  getUserTestState,
  setExperienceMode,
  useUserTestState,
} from '../../lib/userTest/userTestStore'
import { isUserTestEnabled } from '../../lib/userTest/config'

/**
 * The browse mode notice on every service screen, in the 47px status area at the top of the
 * frame (not in Figma). `직접 설문하고 매칭하기` leaves the browse mode and picks up the real flow
 * where the tester left it.
 */
export default function DemoBanner() {
  const navigate = useNavigate()
  const { mode } = useUserTestState()
  if (!isUserTestEnabled() || mode !== 'demo') return null

  return (
    <div
      role="note"
      className="pointer-events-none fixed inset-x-0 top-[max(3px,env(safe-area-inset-top))] z-30 flex justify-center px-3"
    >
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
    </div>
  )
}
