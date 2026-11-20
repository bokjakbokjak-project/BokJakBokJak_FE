import { useNavigate } from 'react-router'
import { restartExperience } from '../../lib/experience/controls'
import { pickAnotherRoommate } from '../../lib/experience/session'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

const BUTTON =
  'flex h-11 flex-1 items-center justify-center rounded-[10px] border border-brand-cream3 bg-white text-[15px] leading-[1.5] font-semibold text-brand-brown1'

/**
 * The end of a matched experience chat: `처음부터` starts the same person over from the start
 * screen; `다음 참가자` keeps their priorities and answers and goes back to the roommate list,
 * without the roommate just matched, to try another one (requested 2026-11-20). The presenter
 * menu keeps its own `다음 참가자` for the next visitor.
 */
export default function ExperienceRestartButtons() {
  const navigate = useNavigate()
  return (
    <div className="flex gap-2">
      <button type="button" className={BUTTON} onClick={restartExperience}>
        처음부터
      </button>
      <button
        type="button"
        className={BUTTON}
        onClick={() => {
          pickAnotherRoommate()
          navigate(ROOMMATE_ROUTES.list)
        }}
      >
        다음 참가자
      </button>
    </div>
  )
}
