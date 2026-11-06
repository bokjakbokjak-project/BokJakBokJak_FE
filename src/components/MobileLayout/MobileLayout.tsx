import { Outlet } from 'react-router'

// Mobile-first page shell. Phones use the real screen size. From the md breakpoint, pages sit
// in a centered frame of the 390x844 Figma size, so tall windows do not stretch them. A shorter
// window keeps every control on the page, because the frame grows with its content and the
// page scrolls. The frame values are provisional until the designer confirms them, and
// YearPickerSheet repeats them to line up with the frame.
export default function MobileLayout() {
  return (
    <div className="flex min-h-dvh w-full flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] md:items-center md:justify-center md:bg-gray-100">
      <div className="flex w-full flex-1 flex-col md:min-h-[min(844px,100dvh)] md:w-[390px] md:flex-none md:rounded-[24px] md:bg-gray-50 md:shadow-[0_0_7.3px_0_rgba(0,0,0,0.25)]">
        <Outlet />
      </div>
    </div>
  )
}
