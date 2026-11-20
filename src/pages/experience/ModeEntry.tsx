import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import {
  getAppMode,
  isExperienceEnabled,
  setAppMode,
  startRouteOf,
  type AppMode,
} from '../../lib/experience/mode'

/**
 * The mode links (요청서 8.5): `/experience` (booth QR) and `/service` (judges). A link names its
 * mode, which wins over the mode last used in this browser; the page reloads in that mode, so
 * nothing of the other one stays. Builds without the experience open the usual first screen.
 * Sign-in and permissions are still the server's to check.
 */
export default function ModeEntry({
  mode,
  children,
}: {
  mode: AppMode
  /** The mode's start screen, once the mode is the one the link names. */
  children?: ReactNode
}) {
  if (!isExperienceEnabled()) return <Navigate to="/" replace />
  if (getAppMode() !== mode) {
    setAppMode(mode)
    // The experience link keeps its query (`?purpose=film`).
    window.location.replace(
      mode === 'experience'
        ? window.location.pathname + window.location.search
        : startRouteOf(mode),
    )
    return null
  }
  return children ?? <Navigate to={startRouteOf(mode)} replace />
}
