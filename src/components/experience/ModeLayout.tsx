import { Outlet } from 'react-router'
import ModeToggle from './ModeToggle'

/** Every screen inside the mobile frame, with the mode switch over it (when the build has it). */
export default function ModeLayout() {
  return (
    <>
      <Outlet />
      <ModeToggle />
    </>
  )
}
