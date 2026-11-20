import { AGREE_TEXT, SCENARIOS, type ScenarioId } from './scenarios'

/**
 * The experience chat as a plain state machine, so a reload, a double press or a late timer
 * cannot add a message twice: every action names the phase it belongs to and does nothing in
 * any other phase.
 *
 *   intro ──choose──▶ partner-replying ──auto──▶ agree ──agree──▶ agreed
 *   agreed ──complete──▶ intro (next agenda) | final
 *   final ──confirm──▶ partner-confirming ──auto──▶ matched
 *
 * Agenda completion and the final match are separate, as on the server: completing an agenda is
 * not the match, and the match needs both final choices.
 */
export type ChatPhase =
  | 'intro'
  | 'partner-replying'
  | 'agree'
  | 'agreed'
  | 'final'
  | 'partner-confirming'
  | 'matched'

export type ChatMessage = {
  id: number
  from: 'me' | 'partner' | 'system'
  text: string
  /** The agreed rule, drawn as a card. */
  agreement?: boolean
}

export type ExperiencePartner = {
  name: string
  /** The sample candidate, or the real candidate's id, only to open its profile again. */
  candidateId: string | null
  /** `real`: from the server's recommendation (user test). Nothing is ever sent to them. */
  source: 'example' | 'real'
}

export type ExperienceChatState = {
  partner: ExperiencePartner
  /** True when the candidate's analysis had no prepared agenda and the example pair took over. */
  switchedToExample: boolean
  agendas: ScenarioId[]
  agendaIndex: number
  phase: ChatPhase
  optionId: string | null
  messages: ChatMessage[]
  /** Raised on every change, so a timer set for an older state does nothing. */
  step: number
}

export type ChatAction =
  | { type: 'choose'; optionId: string }
  | { type: 'agree' }
  | { type: 'complete-agenda' }
  | { type: 'confirm' }
  /** The partner's scheduled move; `step` is the state it was scheduled for. */
  | { type: 'auto'; step: number }

/** How long the partner takes to answer. */
export const AUTO_REPLY_MS = 1200

export function createChat(
  partner: ExperiencePartner,
  agendas: ScenarioId[],
  switchedToExample = false,
): ExperienceChatState {
  return {
    partner,
    switchedToExample,
    agendas,
    agendaIndex: 0,
    phase: 'intro',
    optionId: null,
    messages: [{ id: 1, from: 'system', text: SCENARIOS[agendas[0]].intro }],
    step: 0,
  }
}

export function currentScenario(state: ExperienceChatState) {
  return SCENARIOS[state.agendas[state.agendaIndex]]
}

function currentOption(state: ExperienceChatState) {
  return currentScenario(state).options.find(
    (option) => option.id === state.optionId,
  )
}

function add(
  state: ExperienceChatState,
  message: Omit<ChatMessage, 'id'>,
): ChatMessage[] {
  const lastId = state.messages.at(-1)?.id ?? 0
  return [...state.messages, { ...message, id: lastId + 1 }]
}

/** Whether the partner moves next by itself, after `AUTO_REPLY_MS`. */
export function isWaitingForPartner(state: ExperienceChatState) {
  return (
    state.phase === 'partner-replying' || state.phase === 'partner-confirming'
  )
}

export function chatReducer(
  state: ExperienceChatState,
  action: ChatAction,
): ExperienceChatState {
  const next = (change: Partial<ExperienceChatState>) => ({
    ...state,
    ...change,
    step: state.step + 1,
  })

  switch (action.type) {
    case 'choose': {
      if (state.phase !== 'intro') return state
      const option = currentScenario(state).options.find(
        (candidate) => candidate.id === action.optionId,
      )
      if (!option) return state
      return next({
        phase: 'partner-replying',
        optionId: option.id,
        messages: add(state, { from: 'me', text: option.mine }),
      })
    }
    case 'agree': {
      if (state.phase !== 'agree') return state
      const option = currentOption(state)
      if (!option) return state
      const withMine = {
        ...state,
        messages: add(state, { from: 'me', text: AGREE_TEXT }),
      }
      return next({
        phase: 'agreed',
        messages: add(withMine, {
          from: 'system',
          text: option.agreement,
          agreement: true,
        }),
      })
    }
    case 'complete-agenda': {
      if (state.phase !== 'agreed') return state
      const hasNext = state.agendaIndex + 1 < state.agendas.length
      if (!hasNext) return next({ phase: 'final' })
      const agendaIndex = state.agendaIndex + 1
      return next({
        phase: 'intro',
        agendaIndex,
        optionId: null,
        messages: add(state, {
          from: 'system',
          text: SCENARIOS[state.agendas[agendaIndex]].intro,
        }),
      })
    }
    case 'confirm': {
      if (state.phase !== 'final') return state
      return next({
        phase: 'partner-confirming',
        messages: add(state, { from: 'system', text: '매칭을 확정했어요.' }),
      })
    }
    case 'auto': {
      if (action.step !== state.step) return state
      if (state.phase === 'partner-replying') {
        const option = currentOption(state)
        if (!option) return state
        return next({
          phase: 'agree',
          messages: add(state, { from: 'partner', text: option.partner }),
        })
      }
      if (state.phase === 'partner-confirming') {
        return next({
          phase: 'matched',
          messages: add(state, {
            from: 'system',
            text: `${state.partner.name}님도 매칭을 확정했어요.`,
          }),
        })
      }
      return state
    }
  }
}
