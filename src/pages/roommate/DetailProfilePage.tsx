import { Navigate, useLocation, useParams } from 'react-router'
import AnswerCard from '../../components/AnswerCard/AnswerCard'
import ChatRequestFooter from '../../components/roommate/ChatRequestFooter'
import { candidateCard } from '../../components/roommate/candidateCard'
import ProfileHero from '../../components/roommate/ProfileHero'
import RoommateHeader from '../../components/roommate/RoommateHeader'
import RoommatePage from '../../components/roommate/RoommatePage'
import RoommateSheet from '../../components/roommate/RoommateSheet'
import { getAnswerSummary } from '../../lib/answerSummary'
import { getChatReturnPath } from '../../lib/chat/routes'
import {
  getCandidate,
  getCandidateAnswers,
} from '../../lib/roommate/roommateData'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

/**
 * Figma 1377:36669 (first screen) and 1377:30540 (whole page). The summary cards show the
 * candidate's own answers with the same cards and grouping as the my page. The header and the
 * chat request bar stay in place, and the card and the answers scroll together between them
 * (QA 13). The card sits where the analysis screen has it (QA 12).
 */
export default function DetailProfilePage() {
  const { candidateId } = useParams()
  const { state } = useLocation()
  const candidate = getCandidate(candidateId)

  if (!candidate) {
    return <Navigate to={ROOMMATE_ROUTES.list} replace />
  }

  return (
    <RoommatePage footer={<ChatRequestFooter candidateId={candidate.id} />}>
      {/* Opened from a chat room, the analysis keeps that state so its back returns to the room. */}
      <RoommateHeader
        backTo={ROOMMATE_ROUTES.analysis(candidate.id)}
        backState={getChatReturnPath(state) ? state : undefined}
        title="상세 프로필"
      />
      <div
        data-testid="roommate-scroll"
        className="scrollbar-none flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <ProfileHero profile={candidateCard(candidate)} />
        <RoommateSheet labelledBy="detail-summary-title" scrolls={false}>
          <div className="mx-auto w-full max-w-[390px] px-6 pt-[15px] pb-[35px]">
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
        </RoommateSheet>
      </div>
    </RoommatePage>
  )
}
