import { Outlet } from 'react-router'

/** Paints the onboarding background, reaching into the safe area so no other color shows around it. */
export default function OnboardingSurface() {
  return (
    <div className="-mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex flex-1 flex-col overflow-x-clip bg-brand-cream1 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Outlet />
    </div>
  )
}
