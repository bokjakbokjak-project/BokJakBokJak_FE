import { useLayoutEffect } from 'react'
import { Outlet } from 'react-router'
import { getFrameScale } from './frameScale'

// `--frame-scale` is on the root element because the modal layers are portaled out of the frame.
function useFrameScale() {
  useLayoutEffect(() => {
    const update = () => {
      const scale = getFrameScale(window.innerWidth, window.innerHeight)
      document.documentElement.style.setProperty('--frame-scale', String(scale))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
}

// Mobile-first page shell. Phones use the real screen size and the page scrolls. From the md
// breakpoint, pages sit in a centered 390x844 Figma frame that is zoomed to fill the window
// height, so the layout stays the same at every window size. Long pages scroll inside the frame.
// `contain` makes the frame the containing block of fixed overlays, so they line up with it.
// YearPickerSheet and MissionNotice repeat the frame size and zoom to line up with the frame.
export default function MobileLayout() {
  useFrameScale()

  return (
    <div className="flex min-h-dvh w-full flex-col pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] md:h-dvh md:min-h-0 md:items-center md:justify-center md:overflow-hidden md:bg-gray-100 md:p-0">
      <div className="flex w-full flex-1 flex-col md:h-[844px] md:w-[390px] md:flex-none md:overflow-hidden md:rounded-[24px] md:bg-gray-50 md:shadow-[0_0_7.3px_0_rgba(0,0,0,0.25)] md:[contain:layout] md:[zoom:var(--frame-scale,1)]">
        <div className="scrollbar-none flex flex-1 flex-col md:min-h-0 md:overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
