import { useNavigate } from 'react-router'
import { isUserTestEnabled } from '../../lib/userTest/config'
import { DEMO_ENTRY_ROUTE } from '../../lib/userTest/routes'
import { setExperienceMode } from '../../lib/userTest/userTestStore'

/**
 * `둘러보기로 넘어가기` on the priority step and the survey (user test only, not in Figma). It
 * saves nothing and marks nothing as done: the answers given so far stay in this session, and
 * `직접 설문하고 매칭하기` comes back to them.
 */
export default function BrowseInsteadButton() {
  const navigate = useNavigate()
  if (!isUserTestEnabled()) return null

  return (
    <button
      type="button"
      className="fixed top-[max(10px,calc(env(safe-area-inset-top)+4px))] right-3 z-40 rounded-full border border-brand-brown3 bg-white/90 px-3 py-1 text-[12px] leading-[1.5] font-semibold text-brand-brown3"
      onClick={() => {
        setExperienceMode('demo')
        navigate(DEMO_ENTRY_ROUTE)
      }}
    >
      둘러보기로 넘어가기
    </button>
  )
}
