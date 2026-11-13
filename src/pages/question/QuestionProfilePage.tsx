import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import share from '../../assets/question/share-small.svg'
import AnswerCard from '../../components/AnswerCard/AnswerCard'
import ChoiceDialog from '../../components/dialog/ChoiceDialog'
import ProfileAvatar from '../../components/my/ProfileAvatar'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommateHeader from '../../components/roommate/RoommateHeader'
import RoommatePage from '../../components/roommate/RoommatePage'
import RoommateSheet from '../../components/roommate/RoommateSheet'
import { getAnswerSummary } from '../../lib/answerSummary'
import { HOME_ROUTES, isFromHome } from '../../lib/home/routes'
import { isFromMy, MY_ROUTES } from '../../lib/my/routes'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import {
  canShareToKakao,
  preloadKakaoSdk,
  shareProfileToKakao,
} from '../../lib/share/kakaoShare'
import { createShareUrl } from '../../lib/share/profileShare'
import { QUESTION_COUNT, QUESTION_ROUTES } from './questionData'
import { useQuestion } from './questionState'

/**
 * Age from the birth year chosen in onboarding, counted as this year minus the birth year. The
 * rule is not agreed (OPEN_QUESTIONS DE-12).
 */
function ageOf(birthYear: number | null) {
  return birthYear === null ? null : new Date().getFullYear() - birthYear
}

/**
 * The user's own character in the 100px card slot, drawn like the my page (QA 10). It shrinks
 * with the 84px slot on narrow screens.
 */
function MyCardAvatar({
  priorities,
}: {
  priorities: Parameters<typeof ProfileAvatar>[0]['priorities']
}) {
  return (
    <span className="absolute inset-0 origin-top-left scale-[0.84] min-[390px]:scale-100">
      <ProfileAvatar
        priorities={priorities}
        frame="rounded-[12.5px] bg-card-avatar"
      />
    </span>
  )
}

/**
 * Survey result, Figma 1377:35804. It shows the user's own card and answers in the layout of the
 * roommate detail profile. The card has no match rate. The header and the home button stay in
 * place, and the card and the answers scroll together between them (requested 2026-11-12).
 */
export default function QuestionProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { answers } = useQuestion()
  const { data } = useOnboarding()
  const shareButtonRef = useRef<HTMLButtonElement>(null)
  // `copied` is Figma 1377:36531. `failed` is not in Figma: the link is shown to copy by hand.
  // `kakaoFailed` is not in Figma either: the link stays copied for pasting.
  const [shareState, setShareState] = useState<
    | { status: 'idle' }
    | { status: 'copied'; url: string }
    | { status: 'failed'; url: string }
    | { status: 'kakaoFailed' }
  >({ status: 'idle' })
  const hasKakao = canShareToKakao()

  if (Object.keys(answers).length < QUESTION_COUNT) {
    return <Navigate to={QUESTION_ROUTES.survey} replace />
  }

  const name = data.name.trim() || '사용자'

  // QA 11, 15: sharing copies the link to the shared result and confirms it. With the Kakao key,
  // the confirmation also offers 카카오톡 보내기, which sends the profile card (requested
  // 2026-11-13), so both ways stay available.
  const shareProfile = async () => {
    const origin = window.location.origin
    const url = createShareUrl(
      {
        name,
        department: data.department,
        priorities: data.priorities,
        answers,
      },
      origin,
    )
    if (hasKakao) preloadKakaoSdk()
    try {
      await navigator.clipboard.writeText(url)
      setShareState({ status: 'copied', url })
    } catch {
      setShareState({ status: 'failed', url })
    }
  }

  const sendToKakao = async (url: string) => {
    try {
      await shareProfileToKakao({ name, url, origin: window.location.origin })
      setShareState({ status: 'idle' })
    } catch {
      setShareState({ status: 'kakaoFailed' })
    }
  }

  const closeShare = () => setShareState({ status: 'idle' })

  return (
    <RoommatePage
      footer={
        <div className="relative z-20 shrink-0 bg-brand-cream1 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-[390px] px-6">
            <button
              type="button"
              onClick={() => navigate(HOME_ROUTES.home)}
              className="flex h-[62px] w-full items-center justify-center rounded-[10px] bg-brand-brown1 p-2.5 text-[20px] leading-[1.5] font-semibold text-white"
            >
              홈화면으로 가기
            </button>
          </div>
        </div>
      }
    >
      <RoommateHeader
        backTo={
          isFromHome(location.state)
            ? HOME_ROUTES.home
            : isFromMy(location.state)
              ? MY_ROUTES.my
              : QUESTION_ROUTES.survey
        }
        title="상세 프로필"
        action={
          <button
            ref={shareButtonRef}
            type="button"
            aria-label="공유하기"
            className="size-7 rounded-full border-[1.5px] border-transparent transition-colors hover:border-brand-brown3 hover:bg-brand-beige1 focus-visible:border-brand-brown3 focus-visible:bg-brand-beige1"
            onClick={shareProfile}
          >
            <img src={share} alt="" className="-m-[1.5px] block size-7" />
          </button>
        }
      />
      <div
        data-testid="result-scroll"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {/* QA 12: the card sits where the roommate analysis has it. */}
        <ProfileHero
          profile={{
            name,
            age: ageOf(data.birthYear),
            department: data.department,
            avatar: <MyCardAvatar priorities={data.priorities} />,
          }}
        />
        <RoommateSheet labelledBy="result-summary-title" scrolls={false}>
          <div className="mx-auto w-full max-w-[390px] px-6 pt-[15px] pb-[35px]">
            <h2
              id="result-summary-title"
              className="text-center text-[20px] leading-[1.5] font-bold tracking-[-0.4px] text-gray-500"
            >
              상세 답변 요약
            </h2>
            <div className="mt-[15px] flex flex-col gap-3">
              {getAnswerSummary(answers).map((card) => (
                <AnswerCard key={card.category} card={card} />
              ))}
            </div>
          </div>
        </RoommateSheet>
      </div>
      {shareState.status === 'copied' && (
        <ChoiceDialog
          title="링크 복사 완료!"
          message={
            '링크를 공유하고 다른 룸메이트들과\n설문 결과를 비교해보세요'
          }
          {...(hasKakao
            ? { cancelLabel: '확인', confirmLabel: '카카오톡 보내기' }
            : { confirmLabel: '확인' })}
          triggerRef={shareButtonRef}
          onCancel={closeShare}
          onConfirm={() =>
            hasKakao ? sendToKakao(shareState.url) : closeShare()
          }
        />
      )}
      {shareState.status === 'failed' && (
        <ChoiceDialog
          title="링크를 복사하지 못했어요"
          message={shareState.url}
          {...(hasKakao
            ? { cancelLabel: '확인', confirmLabel: '카카오톡 보내기' }
            : { confirmLabel: '확인' })}
          triggerRef={shareButtonRef}
          onCancel={closeShare}
          onConfirm={() =>
            hasKakao ? sendToKakao(shareState.url) : closeShare()
          }
        />
      )}
      {shareState.status === 'kakaoFailed' && (
        <ChoiceDialog
          title="카카오톡을 열지 못했어요"
          message={'링크는 복사되어 있어요.\n카카오톡에 붙여 넣어 보내주세요.'}
          confirmLabel="확인"
          triggerRef={shareButtonRef}
          onCancel={closeShare}
          onConfirm={closeShare}
        />
      )}
    </RoommatePage>
  )
}
