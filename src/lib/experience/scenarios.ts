/**
 * The scripted agendas of the experience chat (new for the experience, not a server feature).
 * Each one is about a difference the match analysis can show (`이런 점은 조율해봐요`), so the
 * chat talks about what the analysis named. The replies follow the user's choice; nothing is
 * typed freely, so no fixed reply can ignore what the user wrote.
 */
export type ScenarioId = 'cleaning' | 'bedtime' | 'alarm'

export type ScenarioOption = {
  id: string
  /** What the user says. */
  mine: string
  /** The experience partner's answer to it. */
  partner: string
  /** The agreement both reach; an example, not generated from the talk. */
  agreement: string
}

export type Scenario = {
  id: ScenarioId
  title: string
  intro: string
  options: readonly ScenarioOption[]
}

export const AGREE_TEXT = '그렇게 해요'

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  cleaning: {
    id: 'cleaning',
    title: '청소 주기',
    intro: '두 분은 청소 주기에 차이가 있어요. 함께 지킬 기준을 정해볼까요?',
    options: [
      {
        id: 'weekly',
        mine: '주 1회 함께 청소하면 좋겠어요',
        partner: '좋아요. 대신 음식물 쓰레기는 그날 치우면 좋겠어요',
        agreement: '주 1회 공동 청소, 음식물 쓰레기는 당일 처리',
      },
      {
        id: 'turns',
        mine: '공용 공간은 번갈아 청소하면 어때요?',
        partner: '좋아요. 일주일씩 번갈아 맡을까요?',
        agreement: '개인 공간은 각자, 공용 공간은 일주일씩 번갈아 청소',
      },
    ],
  },
  bedtime: {
    id: 'bedtime',
    title: '잠드는 시간',
    intro: '두 분은 잠드는 시간에 차이가 있어요. 밤 시간 규칙을 정해볼까요?',
    options: [
      {
        id: 'lights',
        mine: '자정 이후에는 불을 꺼주면 좋겠어요',
        partner: '좋아요. 늦게 깨어 있을 땐 스탠드만 켤게요',
        agreement: '자정 이후 소등, 늦게 깨어 있으면 스탠드만 사용',
      },
      {
        id: 'quiet',
        mine: '늦게 들어올 땐 조용히만 해주면 괜찮아요',
        partner: '알겠어요. 밤 11시 넘으면 휴대폰도 무음으로 할게요',
        agreement: '늦은 귀가 때는 조용히, 밤 11시 이후 휴대폰 무음',
      },
    ],
  },
  alarm: {
    id: 'alarm',
    title: '아침 알람',
    intro: '두 분은 알람을 맞추는 습관이 달라요. 아침 규칙을 정해볼까요?',
    options: [
      {
        id: 'twice',
        mine: '알람은 두 번까지만 울리면 좋겠어요',
        partner: '좋아요. 대신 진동 알람으로 바꿔볼게요',
        agreement: '알람은 두 번까지, 가능하면 진동으로',
      },
      {
        id: 'wake',
        mine: '못 일어나면 먼저 일어난 사람이 깨워줘도 돼요',
        partner: '좋아요. 그럼 알람은 한 번만 맞출게요',
        agreement: '알람은 한 번만, 못 일어나면 먼저 일어난 사람이 깨우기',
      },
    ],
  },
}

const KEYWORDS: readonly (readonly [ScenarioId, RegExp])[] = [
  ['cleaning', /청소/],
  ['alarm', /알람/],
  ['bedtime', /잠드|잠자리|취침|자정/],
]

/**
 * The agenda for the analysis's `조율해봐요` items, in their order, or null when none of them
 * has a prepared agenda. Then the chat switches to the example pair instead of giving this
 * candidate a difference the analysis never named.
 */
export function scenarioForAdjust(
  adjust: readonly string[],
): ScenarioId | null {
  for (const text of adjust) {
    for (const [id, pattern] of KEYWORDS) {
      if (pattern.test(text)) return id
    }
  }
  return null
}

/** The second agenda of the filming run: another prepared one. */
export function secondScenario(first: ScenarioId): ScenarioId {
  return first === 'cleaning' ? 'bedtime' : 'cleaning'
}

/**
 * The example pair: the sample candidate 김혜나, whose analysis names the cleaning difference, so
 * the example analysis and the chat agree.
 */
export const EXAMPLE_PARTNER = {
  candidateId: 'hyena',
  name: '김혜나',
  scenario: 'cleaning' as ScenarioId,
}
