import { useNavigate } from 'react-router'
import { isUserTestEnabled } from '../../lib/userTest/config'
import { DEMO_ENTRY_ROUTE } from '../../lib/userTest/routes'
import { setExperienceMode } from '../../lib/userTest/userTestStore'
import TestPill from './TestPill'

/**
 * `둘러보기로 넘어가기` on the priority step and the survey (user test only, not in Figma). It
 * saves nothing and marks nothing as done: the answers given so far stay in this session, and
 * `직접 설문하고 매칭하기` comes back to them.
 */
export default function BrowseInsteadButton() {
  const navigate = useNavigate()
  if (!isUserTestEnabled()) return null

  // Centered in the status area at the top, like the switch on the service screens.
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(8px,calc(env(safe-area-inset-top)+4px))] z-40 flex justify-center px-3">
      <TestPill
        onClick={() => {
          setExperienceMode('demo')
          navigate(DEMO_ENTRY_ROUTE)
        }}
      >
        둘러보기로 넘어가기
      </TestPill>
    </div>
  )
}
