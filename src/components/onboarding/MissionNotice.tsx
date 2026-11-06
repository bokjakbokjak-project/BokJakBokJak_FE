import { useEffect, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import missionClip from '../../assets/onboarding/mission-clip.svg'
import { useModalLayer } from '../../lib/onboarding/useModalLayer'

/** Figma note: show the notice for 3-4 seconds. */
export const MISSION_NOTICE_MS = 3500

type MissionNoticeProps = {
  triggerRef: RefObject<HTMLElement | null>
  onClose: () => void
}

/**
 * Mission notice from Figma (1041:29241), centered in the frame. Figma defines no way to close
 * it early. Tapping or pressing Escape closes it, so a keyboard user is not held by the timer.
 */
export default function MissionNotice({
  triggerRef,
  onClose,
}: MissionNoticeProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useModalLayer({ overlayRef, contentRef, triggerRef })

  useEffect(() => {
    const timer = setTimeout(onClose, MISSION_NOTICE_MS)
    return () => clearTimeout(timer)
  }, [onClose])

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-20 flex justify-center md:items-center"
      onClick={onClose}
    >
      <div className="flex h-full w-full items-center justify-center bg-[rgba(18,18,18,0.5)] md:h-[min(844px,100dvh)] md:w-[390px] md:overflow-hidden md:rounded-[24px]">
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-label="미션 안내"
          tabIndex={-1}
          className="relative h-[148px] w-[322px] max-w-[calc(100%-32px)] outline-none"
          onKeyDown={(event) => {
            if (event.key === 'Tab') event.preventDefault()
            if (event.key === 'Escape') onClose()
          }}
        >
          <div className="absolute inset-x-0 top-[33px] h-[115px] rounded-[15px] bg-[#d9d9d9] shadow-[0_0_0_5px_var(--color-brand-brown1)]" />
          <div className="absolute top-1 left-4 h-[105px] w-[160px] rounded-t-[15px] bg-brand-brown1" />
          <div className="absolute inset-x-0 top-[33px] flex h-[114px] flex-col items-center gap-1 rounded-[15px] bg-white px-2 pt-5 text-center break-keep text-gray-500 shadow-[inset_-5px_-5px_0_0_rgba(252,208,169,0.45)]">
            <p className="text-[18px] leading-[1.4] font-bold tracking-[0.36px]">
              내가 가장 중요하게 생각하는
              <br />
              생활습관을 선택해주세요!
            </p>
            <p className="relative top-px text-[13px] leading-[1.5]">
              선택한 우선순위에 따라 내 캐릭터 외형이 바뀌어요!
            </p>
          </div>
          <p className="absolute top-[7px] left-[27px] text-[18px] leading-[1.5] font-bold tracking-[0.36px] text-white">
            MISSION
          </p>
          <img
            src={missionClip}
            alt=""
            className="absolute -top-[0.75px] right-[15.5px] h-[45.5068px] w-[56.485px] max-w-none"
          />
        </div>
      </div>
    </div>,
    document.body,
  )
}
