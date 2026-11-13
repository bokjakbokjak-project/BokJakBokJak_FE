import type { ReactNode } from 'react'
import { LEFT_BUBBLE } from './chatRoomStyles'

/** The chatbot's card: a title with an optional badge, the text, and optional actions. */
export default function AiCard({
  title,
  badge,
  children,
  actions,
}: {
  title: string
  badge?: { text: string; tone: 'open' | 'done' }
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className={`${LEFT_BUBBLE} flex w-[234px] max-w-full flex-col gap-2`}>
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
        <p className="text-[14px] leading-[1.5] font-semibold">{title}</p>
        {badge && (
          <span
            className={`flex h-[21px] shrink-0 items-center rounded-[4px] px-1.5 text-[11px] leading-[1.5] font-semibold ${badge.tone === 'open' ? 'bg-gray-100 text-gray-500' : 'bg-brand-brown1 text-white'}`}
          >
            {badge.text}
          </span>
        )}
      </div>
      <div className="text-[12px] leading-[1.5] break-keep whitespace-pre-line">
        {children}
      </div>
      {actions}
    </div>
  )
}
