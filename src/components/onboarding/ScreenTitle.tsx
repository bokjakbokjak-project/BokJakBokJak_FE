import type { ReactNode } from 'react'

export default function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="relative top-px text-[22px] leading-[1.5] font-semibold text-gray-black">
      {children}
    </h1>
  )
}
