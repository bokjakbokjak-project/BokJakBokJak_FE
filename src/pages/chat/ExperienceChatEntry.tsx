import { Link } from 'react-router'
import { chatGoesToExperience } from '../../lib/experience/experienceChat'
import { EXPERIENCE_ROUTES } from '../../lib/experience/mode'
import { currentScenario } from '../../lib/experience/chatMachine'
import { useExperienceSession } from '../../lib/experience/session'

/** The experience chat on top of the chat list, so it can be opened again from the tab. */
export default function ExperienceChatEntry() {
  const session = useExperienceSession()
  const chat = session?.chat
  if (!chatGoesToExperience() || !chat) return null
  const status =
    chat.phase === 'matched'
      ? '체험 매칭 완료'
      : `조율 중 · ${currentScenario(chat).title}`

  return (
    <Link
      to={EXPERIENCE_ROUTES.chat}
      className="mb-3 flex items-center justify-between gap-3 rounded-[12px] border border-brand-cream3 bg-white px-4 py-3"
    >
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[16px] leading-[1.5] font-bold text-brand-brown1">
          {chat.partner.name}
        </span>
        <span className="text-[13px] leading-[1.5] font-medium text-gray-500">
          {status}
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-brand-beige1 px-2.5 py-0.5 text-[12px] leading-[1.5] font-semibold text-brand-brown3">
        체험 대화
      </span>
    </Link>
  )
}
