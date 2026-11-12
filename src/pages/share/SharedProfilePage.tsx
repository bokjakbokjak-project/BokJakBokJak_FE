import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import AnswerCard from '../../components/AnswerCard/AnswerCard'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommatePage from '../../components/roommate/RoommatePage'
import RoommateSheet from '../../components/roommate/RoommateSheet'
import { getAnswerSummary } from '../../lib/answerSummary'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { readSharedProfile } from '../../lib/share/profileShare'

/** Answer cards a reader sees before the rest is blurred (Figma note 1952:40096). */
const OPEN_CARD_COUNT = 2

/**
 * The survey result opened from a share link (QA 15, Figma 1952:39744). It has no header, no age
 * and no match rate. A popup points to 복작복작 on arrival, and the cards after the second one are
 * blurred behind the same prompt.
 */
export default function SharedProfilePage() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const profile = readSharedProfile(hash)
  const [isPromptOpen, setIsPromptOpen] = useState(true)
  const pageRef = useRef<HTMLDivElement>(null)
  const goToApp = () => navigate(ONBOARDING_ROUTES.login)

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-brand-cream1 px-6 text-center">
        <p className="text-[16px] leading-[1.5] font-medium text-gray-500">
          공유된 프로필을 열 수 없어요.
          <br />
          링크를 다시 확인해주세요.
        </p>
        <button
          type="button"
          className="h-[42px] rounded-full bg-brand-brown1 px-6 text-[16px] font-semibold text-white"
          onClick={goToApp}
        >
          복작복작으로 이동하기
        </button>
      </main>
    )
  }

  const prompt = `복작복작에서 설문조사하고\n${profile.name}님과의 매칭률을 확인해요!`
  const cards = getAnswerSummary(profile.answers)

  return (
    <RoommatePage
      footer={
        <div className="relative z-20 shrink-0 bg-brand-cream1 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[390px] px-6">
            <button
              type="button"
              onClick={goToApp}
              className="flex h-[62px] w-full items-center justify-center rounded-[10px] bg-brand-brown1 p-2.5 text-[20px] leading-[1.5] font-semibold text-white"
            >
              홈화면으로 가기
            </button>
          </div>
        </div>
      }
    >
      <div
        ref={pageRef}
        data-testid="shared-scroll"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {/* No header in Figma: the card block starts 43px under the status bar. */}
        <div className="h-[43px] shrink-0" />
        <ProfileHero
          profile={{
            name: profile.name,
            age: null,
            department: profile.department,
            matchRate: null,
            avatar: (
              <span className="absolute inset-0 origin-top-left scale-[0.84] min-[390px]:scale-100">
                <ProfileAvatar
                  priorities={profile.priorities}
                  frame="rounded-[12.5px] bg-card-avatar"
                />
              </span>
            ),
          }}
        />
        <RoommateSheet labelledBy="shared-summary-title" scrolls={false}>
          <div className="mx-auto w-full max-w-[390px] px-6 pt-[15px] pb-[35px]">
            <h2
              id="shared-summary-title"
              className="text-center text-[20px] leading-[1.5] font-bold tracking-[-0.4px] text-gray-500"
            >
              상세 답변 요약
            </h2>
            <div className="mt-[15px] flex flex-col gap-3">
              {cards.slice(0, OPEN_CARD_COUNT).map((card) => (
                <AnswerCard key={card.category} card={card} />
              ))}
            </div>
            {/* Figma 1952:40084: white at 30% with an 8px background blur over the rest. */}
            <div className="relative mt-3">
              <div
                inert
                aria-hidden
                data-testid="shared-blurred"
                className="flex flex-col gap-3"
              >
                {cards.slice(OPEN_CARD_COUNT).map((card) => (
                  <AnswerCard key={card.category} card={card} />
                ))}
              </div>
              <div className="absolute -inset-x-6 -inset-y-3 bg-white/30 backdrop-blur-[8px]">
                <div className="sticky top-[47px] mx-auto mt-[47px] flex h-[196px] w-[285px] max-w-[calc(100%-32px)] flex-col justify-between rounded-[12px] border-2 border-brand-brown3 bg-brand-cream1 px-[23px] py-[25px] shadow-[0_4px_25px_0_rgba(0,0,0,0.25)]">
                  <p className="text-[18px] leading-[1.5] font-semibold tracking-[-0.36px] break-keep whitespace-pre-line text-brand-brown1">
                    {prompt}
                  </p>
                  <button
                    type="button"
                    className="h-[42px] w-full rounded-full bg-brand-brown1 text-[16px] leading-[1.5] font-semibold text-white"
                    onClick={goToApp}
                  >
                    복작복작으로 이동하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </RoommateSheet>
      </div>
      {isPromptOpen && (
        // Figma 1952:40072, shown when the link opens.
        <ChoiceDialog
          title={prompt}
          closeLabel="닫기"
          confirmLabel="복작복작으로 이동하기"
          triggerRef={pageRef}
          onCancel={() => setIsPromptOpen(false)}
          onConfirm={goToApp}
        />
      )}
    </RoommatePage>
  )
}
