import { Link, useNavigate } from 'react-router'
import { HOME_ROUTES } from '../../lib/home/routes'
import {
  INITIAL_ONBOARDING_DATA,
  useOnboarding,
  type OnboardingData,
} from '../../lib/onboarding/onboardingState'
import { MY_ROUTES } from '../../lib/my/routes'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'
import { QUESTION_COUNT, QUESTION_TOPICS } from '../question/questionData'
import { useQuestion } from '../question/questionState'

// Sample answers for opening a later step directly. They stay in memory and are never saved.
const SCHOOL: Partial<OnboardingData> = {
  department: '미리보기학과',
  studentId: '00000000',
}
const PROFILE: Partial<OnboardingData> = {
  name: '미리보기',
  gender: 'female',
  birthYear: 2005,
}
const DORMITORY: Partial<OnboardingData> = {
  dormitory: '미리보기 기숙사',
  roomCapacity: 2,
}
const PRIORITIES: Partial<OnboardingData> = {
  priorities: [
    'sleep-habit',
    'wake-alarm',
    'cleaning',
    'personal-hygiene',
    'smoking',
  ],
}

/** Development-only index of the onboarding screens. Not part of the production build. */
export default function DevPreviewPage() {
  const { update } = useOnboarding()
  const { answer } = useQuestion()
  const navigate = useNavigate()

  // Built here so that production builds, which never render this page, drop the samples.
  const COMPLETE = { ...SCHOOL, ...PROFILE, ...DORMITORY, ...PRIORITIES }
  const PREVIEWS: { route: string; data: Partial<OnboardingData> }[] = [
    { route: ONBOARDING_ROUTES.school, data: {} },
    { route: ONBOARDING_ROUTES.profile, data: SCHOOL },
    { route: ONBOARDING_ROUTES.dormitory, data: { ...SCHOOL, ...PROFILE } },
    {
      route: ONBOARDING_ROUTES.priority,
      data: { ...SCHOOL, ...PROFILE, ...DORMITORY },
    },
    { route: ONBOARDING_ROUTES.complete, data: COMPLETE },
    { route: HOME_ROUTES.home, data: COMPLETE },
    { route: HOME_ROUTES.previewMatched, data: COMPLETE },
    { route: HOME_ROUTES.notifications, data: COMPLETE },
    { route: HOME_ROUTES.previewTodayNotifications, data: COMPLETE },
    { route: MY_ROUTES.my, data: COMPLETE },
  ]

  return (
    <main className="flex flex-col gap-3 p-6">
      <h1 className="text-[22px] font-semibold">온보딩 미리보기 (개발 전용)</h1>
      <p className="text-[14px] text-gray-500">
        이전 단계를 샘플 값으로 채워 화면을 엽니다. 저장되는 내용은 없으며 실제
        등록이 아닙니다.
      </p>
      <Link
        to={ONBOARDING_ROUTES.login}
        className="text-brand-brown1 underline"
      >
        {ONBOARDING_ROUTES.login}
      </Link>
      <Link to="/roommate" className="text-brand-brown1 underline">
        /roommate
      </Link>
      <button
        type="button"
        className="text-left text-brand-brown1 underline"
        onClick={() => {
          update({ ...INITIAL_ONBOARDING_DATA, ...COMPLETE })
          // Sample answers: the first option for the self questions and the second for the
          // roommate questions, the same as the Figma example card (1532:20058).
          for (let index = 0; index < QUESTION_COUNT; index += 1) {
            const topic = QUESTION_TOPICS[Math.floor(index / 2)]
            answer(
              index,
              index % 2 === 0
                ? topic.self.options[0]
                : topic.roommate.options[1],
            )
          }
          navigate(MY_ROUTES.my)
        }}
      >
        {MY_ROUTES.my} (샘플 설문 답변)
      </button>
      {PREVIEWS.map(({ route, data }) => (
        <button
          key={route}
          type="button"
          className="text-left text-brand-brown1 underline"
          onClick={() => {
            update({ ...INITIAL_ONBOARDING_DATA, ...data })
            navigate(route)
          }}
        >
          {route}
        </button>
      ))}
    </main>
  )
}
