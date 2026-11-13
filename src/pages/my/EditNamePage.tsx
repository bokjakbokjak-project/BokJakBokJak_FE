import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Field, TextInput } from '../../components/onboarding/Field'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHeader from '../../components/my/ProfileHeader'
import { isServerMode } from '../../lib/api/config'
import { errorText } from '../../lib/api/errorText'
import { getSessionGeneration } from '../../lib/auth/tokenStore'
import { isFromMy, MY_ROUTES } from '../../lib/my/routes'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { setMyNickname, useDisplayProfile } from '../../lib/profile/myProfile'
import { checkNickname, saveNickname } from '../../lib/profile/profileApi'

/**
 * Figma 1536:20298 (empty) and 1543:20459 (filled). A nickname is 1-20 characters after
 * trimming, the server's rule. Server mode saves it with PATCH /api/me/profile when 저장 is
 * pressed, never while typing, and shows it everywhere only after the server confirms. Sample
 * mode keeps it in memory, as before.
 */
export default function EditNamePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { update } = useOnboarding()
  const { name: savedName, priorities, state } = useDisplayProfile()
  // Untouched, the field follows the saved nickname, which may arrive after the screen opens.
  const [draft, setDraft] = useState<string | null>(null)
  const value = draft ?? (state.status === 'loading' ? '' : savedName)
  const check = checkNickname(value)
  const [isSaving, setIsSaving] = useState(false)
  const isSavingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Opened from the my page: going back keeps one history entry for it. Opened directly: replace
  // this entry with the my page.
  const leave = () => {
    if (isFromMy(location.state)) navigate(-1)
    else navigate(MY_ROUTES.my, { replace: true })
  }

  const save = async () => {
    if (!check.ok || isSavingRef.current) return
    const { nickname } = check
    if (!isServerMode()) {
      update({ name: nickname })
      leave()
      return
    }
    // The save belongs to the account signed in now; a reply after another sign-in is dropped.
    const generation = getSessionGeneration()
    isSavingRef.current = true
    setIsSaving(true)
    setError(null)
    try {
      const saved = await saveNickname(nickname)
      if (getSessionGeneration() !== generation) return
      setMyNickname(generation, saved)
      update({ name: saved })
      if (isMountedRef.current) leave()
    } catch (caught) {
      if (getSessionGeneration() !== generation || !isMountedRef.current) {
        return
      }
      // The typed nickname stays, so it can be fixed and saved again.
      setError(
        errorText(caught, '닉네임을 저장하지 못했어요. 다시 시도해주세요.'),
      )
    } finally {
      isSavingRef.current = false
      if (isMountedRef.current) setIsSaving(false)
    }
  }

  // Too long is said at once. Blank only disables 저장, as before.
  const lengthMessage =
    !check.ok && value.trim().length > 0 ? check.message : null
  const message = error ?? lengthMessage

  return (
    <form
      className="relative -mt-[env(safe-area-inset-top)] -mb-[env(safe-area-inset-bottom)] flex h-dvh flex-col overflow-hidden bg-brand-cream1 md:h-[844px]"
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
    >
      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto pt-[max(47px,env(safe-area-inset-top))]">
        <ProfileHeader onBack={leave} />
        <main className="flex flex-col">
          <div className="mt-[17.79px]">
            <ProfileAvatar
              priorities={priorities}
              frame="rounded-[35.208px] bg-card-avatar"
              strokeOutside
            />
          </div>
          <div className="mt-[35.79px] px-6 pb-6">
            <Field label="닉네임" htmlFor="my-name">
              <TextInput
                id="my-name"
                value={value}
                placeholder="닉네임을 입력해주세요"
                aria-invalid={message ? true : undefined}
                aria-describedby={message ? 'my-name-message' : undefined}
                onChange={(next) => {
                  setDraft(next)
                  setError(null)
                }}
              />
            </Field>
            {/* Not in Figma: one line under the field, in the dormitory step's failure style. */}
            {message && (
              <p
                id="my-name-message"
                role="alert"
                className="mt-[5px] text-[13px] leading-[1.5] text-gray-500"
              >
                {message}
              </p>
            )}
          </div>
        </main>
      </div>
      <button
        type="submit"
        disabled={!check.ok || isSaving}
        aria-busy={isSaving || undefined}
        className="h-[calc(63px+env(safe-area-inset-bottom))] w-full shrink-0 rounded-t-[6px] bg-brand-brown1 pt-4 pb-[env(safe-area-inset-bottom)] text-[18px] leading-[1.5] font-bold text-white disabled:bg-brand-beige3 disabled:text-gray-400"
      >
        <span className="block h-[47px]">
          {isSaving ? '저장 중...' : '저장'}
        </span>
      </button>
    </form>
  )
}
