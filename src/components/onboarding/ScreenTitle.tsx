import type { ReactNode } from 'react'

export default function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="relative top-px text-[22px] leading-[1.5] font-bold text-brand-brown1">
      {children}
    </h1>
  )
}
