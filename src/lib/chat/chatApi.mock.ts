import type { ChatApi, ChatItem, ChatRoom } from './chatApi'

// Development and demo sample data. Not real users. Every partner is a candidate in the
// roommate sample data (src/lib/roommate/roommateData.ts), so the profile link always works.
// The rooms cover every state in the Figma chat frames (793:5158) and the stages in between:
// matched, ended, waiting for the partner's vote, mid-agenda, talking, and just started.

const studyAgenda: ChatItem = {
  id: 'agenda-1',
  kind: 'agenda',
  title: '1 시험기간, 밤늦은 공부',
  prompt: '몇 시부터 방의 불을 끌까요?\n그 이후 공부할 장소도 함께 정해봐요.',
}

const studyAgreement: ChatItem = {
  id: 'agreement-1',
  kind: 'agreement',
  title: '시험기간, 밤늦은 공부 확정!',
  summary:
    '늦어도 2~3시에는 불을 끄고 취침합니다.\n추가적으로 공부가 필요하다면 독서실을 이용합니다.',
}

const foodAgenda: ChatItem = {
  id: 'agenda-2',
  kind: 'agenda',
  title: '2 배달 음식과 쓰레기 처리',
  prompt:
    '야식을 먹은 뒤 용기와 잔여물은 언제 치울까요?\n음식물 쓰레기 처리 시점과 분리수거 기준도 함께 정해봐요.',
}

/** Numbers messages after the given id, so ids stay unique within a room. */
function messages(
  firstNumber: number,
  lines: readonly (readonly ['me' | 'partner', string])[],
): ChatItem[] {
  return lines.map(([from, text], offset) => ({
    id: `message-${firstNumber + offset}`,
    kind: 'message',
    from,
    text,
  }))
}

type RoomSeed = Pick<
  ChatRoom,
  'id' | 'partnerName' | 'candidateId' | 'matchRate'
> &
  Partial<ChatRoom>

function room(seed: RoomSeed): ChatRoom {
  return {
    updatedAt: '오늘',
    status: 'active',
    listAvatar: 'sleep-mask',
    chatAvatar: 'sleep-mask',
    agendaVoted: false,
    items: [studyAgenda],
    ...seed,
  }
}

function createRooms(): ChatRoom[] {
  return [
    room({
      // Figma 940:19880. The designer used the sleep mask in the room so it differs from mine.
      id: 'minsujeong',
      partnerName: '민수정',
      candidateId: 'sujeong',
      matchRate: 87,
      status: 'matched',
      listAvatar: 'blue-cap',
      items: [
        studyAgenda,
        ...messages(1, [
          [
            'me',
            '저는 새벽 2시에는 방 불을 끄면 좋을 거 같아요 추가적으로 공부가 필요하다면 독서실을 이용했으면 합니다',
          ],
          ['partner', '저도 새벽 3시전에는 방 불을 껐으면 합니다!'],
        ]),
        studyAgreement,
        foodAgenda,
        ...messages(3, [
          [
            'partner',
            '저는 야식 먹고 남은 용기는 물로 바로 씻어두고, 늦어도 다음 날 아침 전까지 분리수거해서 버렸으면 좋겠어요!',
          ],
          [
            'me',
            '좋습니다 냄새나는 음식물 쓰레기만 당일 밤에 바로 비우는 조건이면 다음 날 아침 분리수거 괜찮아요',
          ],
        ]),
        {
          id: 'agreement-2',
          kind: 'agreement',
          title: '2 배달 음식과 쓰레기 처리 확정!',
          summary:
            '배달 음식과 쓰레기 처리 절충안 음식물 쓰레기는 당일 밤에 즉시 비우고, 용기는 물로 씻어둔 뒤 다음 날 아침까지 분리수거합니다.',
        },
      ],
    }),
    room({
      // I pressed 다음 안건 진행하기 and wait for the partner (Figma 988:16735).
      id: 'iseoyun',
      partnerName: '이서윤',
      candidateId: 'seoyun',
      matchRate: 86,
      agendaVoted: true,
      items: [
        studyAgenda,
        ...messages(1, [
          ['partner', '저는 시험기간에도 새벽 1시 전에는 자려고 해요'],
          ['me', '저도 비슷해요! 1시쯤 불 끄면 좋을 것 같아요'],
          ['partner', '더 공부해야 하면 스탠드만 켜는 건 괜찮으세요?'],
          ['me', '네 스탠드는 괜찮아요. 그럼 1시에 큰 불 끄는 걸로 해요'],
        ]),
      ],
    }),
    room({
      // Figma 988:19036.
      id: 'seoyujeong',
      partnerName: '서유정',
      candidateId: 'yujeong',
      matchRate: 83,
      items: [
        studyAgenda,
        ...messages(1, [
          [
            'me',
            '저는 새벽 2시에는 방 불을 끄면 좋을 거 같아요 추가적으로 공부가 필요하다면 독서실을 이용했으면 합니다',
          ],
          ['partner', '저도 새벽 3시전에는 방 불을 껐으면 합니다!'],
        ]),
      ],
    }),
    room({
      // The first agenda is settled and the second one has started.
      id: 'parkjimin',
      partnerName: '박지민',
      candidateId: 'jimin',
      matchRate: 67,
      updatedAt: '어제',
      listAvatar: 'yellow-hat',
      chatAvatar: 'yellow-hat',
      items: [
        studyAgenda,
        ...messages(1, [
          ['partner', '저는 보통 12시 반쯤 자요'],
          ['me', '저는 조금 늦게 자는 편이라 2시까지는 괜찮을까요?'],
          ['partner', '시험기간에만 그러시면 괜찮아요!'],
        ]),
        studyAgreement,
        foodAgenda,
        ...messages(4, [
          ['partner', '저는 방에서 거의 안 먹어서 바로만 치워주시면 돼요'],
        ]),
      ],
    }),
    room({
      id: 'kimhyena',
      partnerName: '김혜나',
      candidateId: 'hyena',
      matchRate: 75,
      updatedAt: '어제',
      items: [
        studyAgenda,
        ...messages(1, [
          ['partner', '안녕하세요! 저는 아침형이라 11시면 자요 😊'],
          ['me', '안녕하세요! 저는 12시쯤 자는데 조용히 할게요'],
        ]),
      ],
    }),
    room({
      id: 'namyungyeong',
      partnerName: '남윤경',
      candidateId: 'yungyeong',
      matchRate: 69,
      updatedAt: '2일전',
    }),
    room({
      // Figma 1236:14142.
      id: 'jeonhyeyun',
      partnerName: '전혜윤',
      candidateId: 'hyeyun',
      matchRate: 71,
      updatedAt: '3일전',
      status: 'ended',
      listAvatar: 'yellow-hat',
      chatAvatar: 'yellow-hat',
      items: [
        studyAgenda,
        ...messages(1, [
          [
            'me',
            '저는 새벽 2시에는 방 불을 끄면 좋을 거 같아요 추가적으로 공부가 필요하다면 독서실을 이용했으면 합니다',
          ],
          ['partner', '저는 무조건 12시에는 누워야 합니다!'],
          ['me', '근데 시험기간이 아니더라도 저는 1시쯤에 자긴 하거든요..'],
          ['me', '1시도 어려우실까요??'],
          ['partner', '네.. 다른 룸메이트 구하셔야 할 거 같아요'],
        ]),
        { id: 'left-1', kind: 'left' },
      ],
    }),
    room({
      id: 'choihaeun',
      partnerName: '최하은',
      candidateId: 'haeun',
      matchRate: 66,
      updatedAt: '3일전',
      listAvatar: 'sleep-mask-white',
    }),
  ]
}

let rooms = createRooms()

/** Restores the sample rooms. Tests call it so that one test's changes do not leak. */
export function resetMockChatRooms() {
  rooms = createRooms()
}

/** The sample rooms as they start, for checks on the data itself. */
export function getSampleChatRooms(): readonly ChatRoom[] {
  return createRooms()
}

function findRoom(id: string) {
  const room = rooms.find((candidate) => candidate.id === id)
  if (!room) throw new Error(`Unknown chat room: ${id}`)
  return room
}

export const mockChatApi: ChatApi = {
  listRooms: async () => structuredClone(rooms),
  getRoom: async (id) => {
    const room = rooms.find((candidate) => candidate.id === id)
    return room ? structuredClone(room) : null
  },
  sendMessage: async (id, text) => {
    const room = findRoom(id)
    if (room.status === 'ended') throw new Error('The chat room has ended.')
    room.items.push({
      id: `message-${room.items.length + 1}`,
      kind: 'message',
      from: 'me',
      text,
    })
    return structuredClone(room)
  },
  setAgendaVote: async (id, voted) => {
    const room = findRoom(id)
    room.agendaVoted = voted
    return structuredClone(room)
  },
  endRoom: async (id) => {
    findRoom(id).status = 'ended'
  },
}
