import { Link, Navigate, useParams } from 'react-router'
import panelDecor from '../../assets/onboarding/panel-decor.svg'
import iconAdjust from '../../assets/roommate/analysis-adjust.png'
import iconCheck from '../../assets/roommate/analysis-check.png'
import iconGood from '../../assets/roommate/analysis-good.png'
import cardRibbon from '../../assets/roommate/card-ribbon.svg'
import ChatRequestBar from '../../components/roommate/ChatRequestBar'
import ProfileCard from '../../components/roommate/ProfileCard'
import RoommateHeader from '../../components/roommate/RoommateHeader'
import RoommatePage from '../../components/roommate/RoommatePage'
import { getCandidate } from '../../lib/roommate/roommateData'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

// Icon crops come from the Figma image fills (1057:14785, 1057:14790, 1057:14796).
const CATEGORIES = [
  {
    key: 'good',
    title: '이런 점이 잘 맞아요',
    icon: iconGood,
    crop: 'top-[-35.71%] left-[-35.71%] size-[171.43%]',
    gap: 'gap-[3px]',
  },
  {
    key: 'adjust',
    title: '이런 점은 조율해봐요',
    icon: iconAdjust,
    crop: 'top-[-29.47%] left-[-29.47%] size-[158.95%]',
    gap: 'gap-[3px]',
  },
  {
    key: 'check',
    title: '아직 확인이 필요해요',
    icon: iconCheck,
    crop: 'top-[-29.37%] left-[-29.37%] size-[158.73%]',
    gap: 'gap-0.5',
  },
] as const

export default function MatchAnalysisPage() {
  const { candidateId } = useParams()
  const candidate = getCandidate(candidateId)

  if (!candidate) {
    return <Navigate to={ROOMMATE_ROUTES.list} replace />
  }

  return (
    <RoommatePage>
      <RoommateHeader backTo={ROOMMATE_ROUTES.list} />
      <div className="relative mx-auto h-[293px] w-full max-w-[390px] shrink-0">
        <img
          src={cardRibbon}
          alt=""
          className="absolute top-[203.94px] right-[53px] h-[69.058px] w-[80.953px] max-w-none"
        />
        <div className="absolute -top-[9px] right-[3px] flex h-[249.909px] w-[308px] items-center justify-center">
          <div className="h-[204.073px] w-[276.062px] shrink-0 rotate-[10.24deg] rounded-[14px] bg-roommate-card-back" />
        </div>
        <Link
          to={ROOMMATE_ROUTES.profile(candidate.id)}
          className="absolute top-[188.58px] left-[38px] flex w-[161px] items-center justify-center rounded-b-[15px] bg-brand-brown3 px-2.5 pt-[35px] pb-2.5 text-[16px] leading-[1.5] font-semibold whitespace-nowrap text-white"
        >
          상세프로필 보기 →
        </Link>
        <div className="absolute inset-x-6 top-[13.58px]">
          <ProfileCard candidate={candidate} variant="analysis" />
        </div>
      </div>
      <section className="relative z-10 flex flex-1 flex-col rounded-t-[35px] bg-brand-cream1 shadow-[0_0_0_2px_var(--color-brand-brown2)]">
        <img
          src={panelDecor}
          alt=""
          className="absolute top-[15px] left-1/2 h-[27px] w-[116.003px] max-w-none -translate-x-1/2"
        />
        <div className="relative mx-auto w-full max-w-[390px] px-6 pt-[57px] pb-[17.5px]">
          <h2 className="relative -left-[5.5px] text-center text-[20px] leading-[1.5] font-bold tracking-[-0.4px] text-gray-500">
            {candidate.givenName}님과의 나의 매칭결과
          </h2>
          <ul className="mt-[21px] flex flex-col gap-2.5">
            {CATEGORIES.map(({ key, title, icon, crop, gap }) => {
              const lines = candidate.analysis[key]
              if (lines.length === 0) return null
              return (
                <li
                  key={key}
                  className="flex min-h-[87.5px] flex-col gap-2 rounded-[12px] border border-brand-cream3 bg-brand-cream2 px-4 pt-4 pb-[13px] text-gray-500"
                >
                  <h3
                    className={`flex items-center text-[16px] leading-[1.5] font-bold ${gap}`}
                  >
                    <span className="relative size-[26px] shrink-0 overflow-hidden">
                      <img
                        src={icon}
                        alt=""
                        className={`absolute max-w-none ${crop}`}
                      />
                    </span>
                    {title}
                  </h3>
                  <div className="text-[14px] leading-[1.5] font-medium">
                    {lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
        <ChatRequestBar variant="analysis" />
      </section>
    </RoommatePage>
  )
}
