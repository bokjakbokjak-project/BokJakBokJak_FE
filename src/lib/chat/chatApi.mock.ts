import type { ChatApi, ChatItem, ChatRoom } from './chatApi'

// Development and demo sample data, copied from the Figma chat frames (793:5158). Not real
// users. The rooms cover every state in Figma: matched, ended, in progress, and just started.

const studyAgenda: ChatItem = {
  id: 'agenda-1',
  kind: 'agenda',
  title: '1 시험기간, 밤늦은 공부',
  prompt: '몇 시부터 방의 불을 끌까요?\n그 이후 공부할 장소도 함께 정해봐요.',
}

const myStudyReply: ChatItem = {
  id: 'message-1',
  kind: 'message',
  from: 'me',
  text: '저는 새벽 2시에는 방 불을 끄면 좋을 거 같아요 추가적으로 공부가 필요하다면 독서실을 이용했으면 합니다',
}

const partnerStudyReply: ChatItem = {
  id: 'message-2',
  kind: 'message',
  from: 'partner',
  text: '저도 새벽 3시전에는 방 불을 껐으면 합니다!',
}

function startedRoom(
  id: string,
  partnerName: string,
  matchRate: number,
  listAvatar: ChatRoom['listAvatar'] = 'sleep-mask',
): ChatRoom {
  return {
    id,
    partnerName,
    matchRate,
    updatedAt: '오늘',
    status: 'active',
    listAvatar,
    chatAvatar: 'sleep-mask',
    agendaVoted: false,
    items: [studyAgenda],
  }
}

function createRooms(): ChatRoom[] {
  return [
    {
      // Figma 940:19880. The designer used the sleep mask in the room so it differs from mine.
      id: 'minsujeong',
      partnerName: '민수정',
      candidateId: 'sujeong',
      matchRate: 87,
      updatedAt: '오늘',
      status: 'matched',
      listAvatar: 'blue-cap',
      chatAvatar: 'sleep-mask',
      agendaVoted: false,
      items: [
        studyAgenda,
        myStudyReply,
        partnerStudyReply,
        {
          id: 'agreement-1',
          kind: 'agreement',
          title: '시험기간, 밤늦은 공부 확정!',
          summary:
            '늦어도 2~3시에는 불을 끄고 취침합니다.\n추가적으로 공부가 필요하다면 독서실을 이용합니다.',
        },
        {
          id: 'agenda-2',
          kind: 'agenda',
          title: '2 배달 음식과 쓰레기 처리',
          prompt:
            '야식을 먹은 뒤 용기와 잔여물은 언제 치울까요?\n음식물 쓰레기 처리 시점과 분리수거 기준도 함께 정해봐요.',
        },
        {
          id: 'message-3',
          kind: 'message',
          from: 'partner',
          text: '저는 야식 먹고 남은 용기는 물로 바로 씻어두고, 늦어도 다음 날 아침 전까지 분리수거해서 버렸으면 좋겠어요!',
        },
        {
          id: 'message-4',
          kind: 'message',
          from: 'me',
          text: '좋습니다 냄새나는 음식물 쓰레기만 당일 밤에 바로 비우는 조건이면 다음 날 아침 분리수거 괜찮아요',
        },
        {
          id: 'agreement-2',
          kind: 'agreement',
          title: '2 배달 음식과 쓰레기 처리 확정!',
          summary:
            '배달 음식과 쓰레기 처리 절충안 음식물 쓰레기는 당일 밤에 즉시 비우고, 용기는 물로 씻어둔 뒤 다음 날 아침까지 분리수거합니다.',
        },
      ],
    },
    {
      // Figma 988:19036.
      ...startedRoom('seoyujeong', '서유정', 83),
      candidateId: 'yujeong',
      items: [studyAgenda, myStudyReply, partnerStudyReply],
    },
    { ...startedRoom('kimhyena', '김혜나', 75), candidateId: 'hyena' },
    startedRoom('hansuhui', '한수희', 77),
    { ...startedRoom('namyungyeong', '남윤경', 69), candidateId: 'yungyeong' },
    {
      // Figma 1236:14142.
      id: 'jeonhyeyun',
      partnerName: '전혜윤',
      candidateId: 'hyeyun',
      matchRate: 71,
      updatedAt: '오늘',
      status: 'ended',
      listAvatar: 'yellow-hat',
      chatAvatar: 'yellow-hat',
      agendaVoted: false,
      items: [
        studyAgenda,
        myStudyReply,
        {
          id: 'message-2',
          kind: 'message',
          from: 'partner',
          text: '저는 무조건 12시에는 누워야 합니다!',
        },
        {
          id: 'message-3',
          kind: 'message',
          from: 'me',
          text: '근데 시험기간이 아니더라도 저는 1시쯤에 자긴 하거든요..',
        },
        {
          id: 'message-4',
          kind: 'message',
          from: 'me',
          text: '1시도 어려우실까요??',
        },
        {
          id: 'message-5',
          kind: 'message',
          from: 'partner',
          text: '네.. 다른 룸메이트 구하셔야 할 거 같아요',
        },
        { id: 'left-1', kind: 'left' },
      ],
    },
    startedRoom('jinseoyul', '진서율', 80, 'sleep-mask-white'),
  ]
}

let rooms = createRooms()

/** Restores the sample rooms. Tests call it so that one test's changes do not leak. */
export function resetMockChatRooms() {
  rooms = createRooms()
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
