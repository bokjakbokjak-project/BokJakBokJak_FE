import { Navigate, useParams } from 'react-router'
import panelDecor from '../../assets/onboarding/panel-decor.svg'
import AnswerCard from '../../components/AnswerCard/AnswerCard'
import ChatRequestBar from '../../components/roommate/ChatRequestBar'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommateHeader from '../../components/roommate/RoommateHeader'
import RoommatePage from '../../components/roommate/RoommatePage'
import { getAnswerSummary } from '../../lib/answerSummary'
import {
  getCandidate,
  getCandidateAnswers,
} from '../../lib/roommate/roommateData'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

/**
 * Figma 1377:36669 (first screen) and 1377:30540 (whole page). The summary cards show the
 * candidate's own answers with the same cards and grouping as the my page. Only the content
 * scrolls; the chat request bar stays at the bottom.
 */
export default function DetailProfilePage() {
  const { candidateId } = useParams()
  const candidate = getCandidate(candidateId)

  if (!candidate) {
    return <Navigate to={ROOMMATE_ROUTES.list} replace />
  }

  return (
    <RoommatePage footer={<ChatRequestBar />}>
      <RoommateHeader
        backTo={ROOMMATE_ROUTES.analysis(candidate.id)}
        title="상세 프로필"
      />
      <ProfileHero candidate={candidate} offset={9} />
      <section
        aria-labelledby="detail-summary-title"
        className="relative z-10 flex flex-1 flex-col rounded-t-[35px] bg-brand-cream1 shadow-[0_0_0_2px_var(--color-brand-brown2)]"
      >
        <img
          src={panelDecor}
          alt=""
          className="absolute top-[15px] left-1/2 h-[27px] w-[116.003px] max-w-none -translate-x-1/2"
        />
        <div className="mx-auto w-full max-w-[390px] px-6 pt-[57px] pb-[35px]">
          <h2
            id="detail-summary-title"
            className="text-center text-[20px] leading-[1.5] font-bold tracking-[-0.4px] text-gray-500"
          >
            상세 답변 요약
          </h2>
          <div className="mt-[15px] flex flex-col gap-3">
            {getAnswerSummary(getCandidateAnswers(candidate)).map((card) => (
              <AnswerCard key={card.category} card={card} />
            ))}
          </div>
        </div>
      </section>
    </RoommatePage>
  )
}
