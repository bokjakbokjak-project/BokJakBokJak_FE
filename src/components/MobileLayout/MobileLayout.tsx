import { Outlet } from 'react-router'

// Mobile-first page shell. The desktop max width is not defined in Figma yet,
// so the layout stays full width until the designer confirms a value.
export default function MobileLayout() {
  return (
    <div className="flex min-h-dvh w-full flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]">
      <Outlet />
    </div>
  )
}
