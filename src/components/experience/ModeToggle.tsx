import { useRef, useState } from 'react'
import { useLocation } from 'react-router'
import {
  getAppMode,
  isExperienceEnabled,
  switchAppMode,
  type AppMode,
} from '../../lib/experience/mode'
import { SHARE_ROUTE } from '../../lib/share/profileShare'
import ChoiceDialog from '../dialog/ChoiceDialog'

const LABELS: Record<AppMode, string> = {
  experience: '핵심 체험',
  service: '전체 서비스',
}

const CONFIRM: Record<AppMode, { title: string; message: string }> = {
  experience: {
    title: '핵심 체험으로 바꿀까요?',
    message:
      '로그인 없이 예시 데이터로 체험해요.\n지금 화면에서 저장하지 않은 입력은 사라져요.',
  },
  service: {
    title: '전체 서비스로 바꿀까요?',
    message:
      '학교 계정으로 로그인해 실제 서버로 진행해요.\n지금 화면에서 저장하지 않은 입력은 사라져요.',
  },
}

/**
 * `핵심 체험 | 전체 서비스` at the top center, in the status area above the headers (요청서 8.1).
 * Both choices always show, the current one filled. Switching asks first, since it opens the
 * other mode's start screen and drops what was not saved. Only builds with the experience.
 */
export default function ModeToggle() {
  const { pathname } = useLocation()
  const [target, setTarget] = useState<AppMode | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // A shared profile is opened by anyone and belongs to neither mode.
  if (!isExperienceEnabled() || pathname === SHARE_ROUTE) return null
  const current = getAppMode()

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-[max(8px,calc(env(safe-area-inset-top)+4px))] z-[25] flex justify-center px-3">
        <div
          role="group"
          aria-label="모드"
          className="pointer-events-auto flex rounded-full bg-white/95 p-[3px] shadow-[0_3px_10px_rgba(97,71,53,0.25)] ring-1 ring-brand-cream3"
        >
          {(['experience', 'service'] as const).map((mode) => {
            const active = mode === current
            return (
              <button
                key={mode}
                ref={active ? undefined : triggerRef}
                type="button"
                aria-pressed={active}
                className={`rounded-full px-3 py-[5px] text-[12px] leading-[1.4] font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-brand-brown1 text-white'
                    : 'text-brand-brown3 hover:bg-brand-beige1'
                }`}
                onClick={() => {
                  if (!active) setTarget(mode)
                }}
              >
                {LABELS[mode]}
              </button>
            )
          })}
        </div>
      </div>
      {target && (
        <ChoiceDialog
          title={CONFIRM[target].title}
          message={CONFIRM[target].message}
          cancelLabel="취소"
          confirmLabel="바꾸기"
          triggerRef={triggerRef}
          onCancel={() => setTarget(null)}
          onConfirm={() => switchAppMode(target)}
        />
      )}
    </>
  )
}
