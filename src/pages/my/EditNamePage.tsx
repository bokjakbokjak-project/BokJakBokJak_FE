import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Field, TextInput } from '../../components/onboarding/Field'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHeader from '../../components/my/ProfileHeader'
import { isFromMy, MY_ROUTES } from '../../lib/my/routes'
import { useOnboarding } from '../../lib/onboarding/onboardingState'

/**
 * Figma 1536:20298 (empty) and 1543:20459 (filled). Uses the same rule as the onboarding step: a
 * nickname is valid when it is not blank. Nothing is sent to a server.
 */
export default function EditNamePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data, update } = useOnboarding()
  const [draft, setDraft] = useState(data.name)
  const trimmed = draft.trim()
  const canSave = trimmed.length > 0

  // Opened from the my page: going back keeps one history entry for it. Opened directly: replace
  // this entry with the my page.
  const leave = () => {
    if (isFromMy(location.state)) navigate(-1)
    else navigate(MY_ROUTES.my, { replace: true })
  }

  return (
    <form
      className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex h-dvh flex-col overflow-hidden bg-brand-cream1 md:h-[844px]"
      onSubmit={(event) => {
        event.preventDefault()
        if (!canSave) return
        update({ name: trimmed })
        leave()
      }}
    >
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pt-[max(47px,env(safe-area-inset-top))]">
        <ProfileHeader onBack={leave} />
        <main className="flex flex-col">
          <div className="mt-[17.79px]">
            <ProfileAvatar priorities={data.priorities} />
          </div>
          <div className="mt-[35.79px] px-6 pb-6">
            <Field label="닉네임" htmlFor="my-name">
              <TextInput
                id="my-name"
                value={draft}
                placeholder="닉네임을 입력해주세요"
                onChange={setDraft}
              />
            </Field>
          </div>
        </main>
      </div>
      <button
        type="submit"
        disabled={!canSave}
        className="h-[calc(63px+env(safe-area-inset-bottom))] w-full shrink-0 rounded-t-[6px] bg-brand-brown1 pt-4 pb-[env(safe-area-inset-bottom)] text-[18px] leading-[1.5] font-bold text-white disabled:bg-brand-beige3 disabled:text-gray-400"
      >
        <span className="block h-[47px]">저장</span>
      </button>
    </form>
  )
}
