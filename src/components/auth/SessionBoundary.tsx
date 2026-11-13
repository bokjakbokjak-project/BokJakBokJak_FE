import { Fragment } from 'react'
import { Outlet } from 'react-router'
import { useAuth } from '../../lib/auth/authState'

/**
 * Remounts the session's screens and their providers when a session starts or ends, so the
 * onboarding and survey answers kept in memory are not shown to whoever signs in next.
 */
export default function SessionBoundary() {
  const { sessionId } = useAuth()
  return (
    <Fragment key={sessionId}>
      <Outlet />
    </Fragment>
  )
}
