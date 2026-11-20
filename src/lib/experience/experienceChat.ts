import { isUserTestEnabled } from '../userTest/config'
import { getParticipantId } from '../userTest/userTestStore'
import {
  chatReducer,
  createChat,
  type ChatAction,
  type ExperiencePartner,
} from './chatMachine'
import { isExperienceMode } from './mode'
import { EXAMPLE_PARTNER, scenarioForAdjust, secondScenario } from './scenarios'
import { getExperienceSession, updateExperienceSession } from './session'

/**
 * Whether `대화 요청하기` opens the experience chat instead of a real chat request: always in
 * the experience mode, and for a signed-in tester of the user test, whose recommendations and
 * analysis are real but whose chat is the experience (no request or message reaches anyone).
 */
export function chatGoesToExperience() {
  if (isExperienceMode()) return true
  return isUserTestEnabled() && getParticipantId() !== null
}

/**
 * Starts the experience chat with the chosen candidate, as a snapshot of the name and the
 * analysis's `조율해봐요` items. Their difference picks the agenda; when no prepared agenda
 * fits, the example pair takes over (and the chat says so), rather than giving the candidate a
 * difference their analysis never named. The candidate's id is kept only to open the profile
 * again; it never reaches a chat or matching API.
 */
export function startExperienceChat(target: {
  name: string
  candidateId: string | null
  source: ExperiencePartner['source']
  adjust: readonly string[]
}) {
  const purpose = getExperienceSession()?.purpose ?? 'booth'
  const fitted = scenarioForAdjust(target.adjust)
  const partner: ExperiencePartner = fitted
    ? {
        name: target.name,
        candidateId: target.candidateId,
        source: target.source,
      }
    : {
        name: EXAMPLE_PARTNER.name,
        candidateId: EXAMPLE_PARTNER.candidateId,
        source: 'example',
      }
  const first = fitted ?? EXAMPLE_PARTNER.scenario
  // The booth finishes one agenda; the filming run may show two.
  const agendas = purpose === 'film' ? [first, secondScenario(first)] : [first]
  updateExperienceSession((session) => ({
    ...session,
    chat: createChat(partner, agendas, fitted === null),
    matched: null,
  }))
}

export function dispatchExperienceChat(action: ChatAction) {
  updateExperienceSession((session) => {
    if (!session.chat) return session
    const chat = chatReducer(session.chat, action)
    if (chat === session.chat) return session
    return {
      ...session,
      chat,
      matched:
        chat.phase === 'matched'
          ? { name: chat.partner.name }
          : session.matched,
    }
  })
}
