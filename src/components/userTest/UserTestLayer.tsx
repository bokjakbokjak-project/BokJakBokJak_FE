import { Outlet } from 'react-router'
import DemoBanner from './DemoBanner'

/**
 * Wraps the service screens (home, my page, roommates, chat, notifications) so the browse mode
 * notice shows on all of them. Inside the mobile frame, so the notice lines up with it on PC.
 */
export default function UserTestLayer() {
  return (
    <>
      <Outlet />
      <DemoBanner />
    </>
  )
}
