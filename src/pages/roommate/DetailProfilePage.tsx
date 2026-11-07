import { Navigate, useParams } from 'react-router'
import ChatRequestBar from '../../components/roommate/ChatRequestBar'
import ProfileCard from '../../components/roommate/ProfileCard'
import RoommateHeader from '../../components/roommate/RoommateHeader'
import RoommatePage from '../../components/roommate/RoommatePage'
import { getCandidate, type AnswerTone } from '../../lib/roommate/roommateData'
import { ROOMMATE_ROUTES } from '../../lib/roommate/routes'

// Figma frames "N순위(프레임 색 구별)" (1095:27512, 1095:27519, 1095:27525, 1095:27530).
const TONE_CLASS: Record<AnswerTone, string> = {
  rank1: 'min-h-[106px] border border-brand-cream3 bg-brand-cream2',
  rank2: 'min-h-[94px] border border-roommate-rank2-border bg-brand-beige5',
  rank3: 'min-h-[106px] border border-roommate-rank3-border bg-brand-beige2',
  rest: 'min-h-[94px] bg-white',
}

export default function DetailProfilePage() {
  const { candidateId } = useParams()
  const candidate = getCandidate(candidateId)

  if (!candidate) {
    return <Navigate to={ROOMMATE_ROUTES.list} replace />
  }

  return (
    <RoommatePage>
      <RoommateHeader backTo={ROOMMATE_ROUTES.analysis(candidate.id)} />
      <div className="mx-auto w-full max-w-[390px] px-6">
        <ProfileCard candidate={candidate} variant="detail" />
        <ul className="mt-[45px] flex flex-col gap-2.5 pb-[37px]">
          {candidate.answers.map((row, index) => (
            <li
              key={row.id}
              data-tone={row.tone}
              className={`relative flex flex-col justify-center rounded-[10px] p-2 text-[14px] leading-[normal] ${TONE_CLASS[row.tone]}`}
            >
              <p className="font-semibold text-gray-black min-[390px]:whitespace-pre-line">
                {row.question}
              </p>
              <div
                className={`mt-2.5 flex flex-col gap-1 ${index === 0 ? 'pr-14' : ''}`}
              >
                <p className="font-semibold text-brand-brown1">
                  {row.selfAnswer}
                </p>
                <p className="font-medium text-gray-500">{row.partnerAnswer}</p>
              </div>
              {index === 0 && (
                <ul className="absolute top-[53px] right-[18px] flex flex-col gap-[5px] text-[12px]">
                  <li className="flex items-center gap-[7px] font-semibold text-brand-brown1">
                    <span className="size-[3px] rounded-full bg-current" />
                    본인
                  </li>
                  <li className="flex items-center gap-[7px] font-medium text-gray-500">
                    <span className="size-[3px] rounded-full bg-current" />
                    상대
                  </li>
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
      <ChatRequestBar variant="detail" />
    </RoommatePage>
  )
}
