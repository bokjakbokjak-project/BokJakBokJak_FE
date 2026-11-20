import {
  nextParticipant,
  restartExperience,
} from '../../lib/experience/controls'

const BUTTON =
  'flex h-11 flex-1 items-center justify-center rounded-[10px] border border-brand-cream3 bg-white text-[15px] leading-[1.5] font-semibold text-brand-brown1'

/** The experience's two ends (요청서 8.4): the same person again, or the next person. */
export default function ExperienceRestartButtons() {
  return (
    <div className="flex gap-2">
      <button type="button" className={BUTTON} onClick={restartExperience}>
        처음부터
      </button>
      <button type="button" className={BUTTON} onClick={nextParticipant}>
        다음 참가자
      </button>
    </div>
  )
}
