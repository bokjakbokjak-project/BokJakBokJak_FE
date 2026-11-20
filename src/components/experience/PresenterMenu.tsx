import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  nextParticipant,
  restartExperience,
} from '../../lib/experience/controls'
import {
  updateExperienceSession,
  useExperienceSession,
} from '../../lib/experience/session'
import {
  SCENE_LABELS,
  useExperienceSetup,
  type ExperienceScene,
} from '../../lib/experience/useExperienceSetup'
import { useModalLayer } from '../../lib/onboarding/useModalLayer'

const ROW =
  'flex h-11 w-full items-center justify-center rounded-[10px] border border-brand-cream3 bg-white text-[15px] leading-[1.5] font-semibold text-brand-brown1'

/**
 * The presenter's menu (요청서 4.1, 8.4), a small round button at the top right of the status
 * area in the experience mode only. `처음부터` restarts this participant, `다음 참가자` starts a
 * new one, and the filming setup adds the scene jumps, each with its state prepared.
 */
export default function PresenterMenu() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="진행자 메뉴"
        aria-haspopup="dialog"
        className="fixed top-[max(10px,calc(env(safe-area-inset-top)+6px))] right-3 z-[25] flex size-[30px] items-center justify-center rounded-full bg-white/95 text-[15px] leading-none font-bold text-brand-brown3 shadow-[0_2px_8px_rgba(97,71,53,0.2)] ring-1 ring-brand-cream3"
        onClick={() => setOpen(true)}
      >
        ⋯
      </button>
      {open && (
        <MenuDialog triggerRef={buttonRef} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function MenuDialog({
  triggerRef,
  onClose,
}: {
  triggerRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
}) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  useModalLayer({ overlayRef, contentRef, triggerRef })
  const session = useExperienceSession()
  const { jumpTo } = useExperienceSetup()
  const isFilm = session?.purpose === 'film'

  const jump = (scene: ExperienceScene) => {
    onClose()
    jumpTo(scene)
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-center md:items-center"
      onClick={onClose}
    >
      <div className="flex h-full w-full items-center justify-center bg-[rgba(18,18,18,0.6)] md:h-[844px] md:w-[390px] md:overflow-hidden md:rounded-[24px] md:[zoom:var(--frame-scale,1)]">
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-label="진행자 메뉴"
          tabIndex={-1}
          className="flex w-[300px] max-w-[calc(100%-32px)] flex-col gap-2 rounded-[12px] border-2 border-brand-brown3 bg-brand-cream1 p-5 outline-none"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose()
          }}
        >
          <h2 className="text-[17px] leading-[1.5] font-bold text-brand-brown1">
            진행자 메뉴
          </h2>
          <p className="text-[12px] leading-[1.5] font-medium text-gray-500">
            {isFilm ? '촬영 진행' : '부스 진행'} · 시도 {session?.attempt ?? 1}
          </p>
          <button type="button" className={ROW} onClick={restartExperience}>
            처음부터
          </button>
          <button type="button" className={ROW} onClick={nextParticipant}>
            다음 참가자
          </button>
          <button
            type="button"
            className={ROW}
            onClick={() =>
              updateExperienceSession((current) => ({
                ...current,
                purpose: isFilm ? 'booth' : 'film',
              }))
            }
          >
            {isFilm ? '부스 진행으로 바꾸기' : '촬영 진행으로 바꾸기'}
          </button>
          {isFilm && (
            <>
              <p className="mt-2 text-[13px] leading-[1.5] font-semibold text-brand-brown3">
                장면 이동 (예시 상태를 준비해요)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(SCENE_LABELS) as ExperienceScene[]).map(
                  (scene) => (
                    <button
                      key={scene}
                      type="button"
                      className={ROW}
                      onClick={() => jump(scene)}
                    >
                      {SCENE_LABELS[scene]}
                    </button>
                  ),
                )}
              </div>
            </>
          )}
          <button
            type="button"
            className="mt-1 h-10 text-[14px] font-semibold text-gray-500"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
