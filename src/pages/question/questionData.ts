import sceneAlarm from '../../assets/question/scene-alarm.png'
import sceneBedtime from '../../assets/question/scene-bedtime.png'
import sceneBelongings from '../../assets/question/scene-belongings.png'
import sceneDishes from '../../assets/question/scene-dishes.png'
import sceneFloor from '../../assets/question/scene-floor.png'
import sceneFood from '../../assets/question/scene-food.png'
import sceneSleep from '../../assets/question/scene-sleep.png'
import sceneSmoking from '../../assets/question/scene-smoking.png'
import situationBedtime from '../../assets/question/situation-bedtime.png'
import situationSleep from '../../assets/question/situation-sleep.png'

export const QUESTION_ROUTES = {
  survey: '/question',
  profile: '/question/profile',
} as const

type Question = {
  /** Line breaks follow the Figma frame. */
  text: string
  options: readonly string[]
}

export type QuestionTopic = {
  id: string
  /** Shown for a moment before the self question. */
  situation: string
  scene: string
  /**
   * Full-height picture of the STEP screen (Figma 1377:49785). Only the first two topics have
   * one. `dark` puts white copy on the night picture (OPEN_QUESTIONS DE-10).
   */
  situationScene?: { src: string; tone: 'dark' | 'light' }
  /** The smoking frames sit 15px higher with a shorter sheet (986:13764). */
  layout: 'default' | 'compact'
  self: Question
  roommate: Question
}

// Copy follows the survey frames in Figma 787:4924, which differ from the spec text in 733:3483.
// OPEN_QUESTIONS DE-7 lists both those differences and the typos corrected here.
export const QUESTION_TOPICS: readonly QuestionTopic[] = [
  {
    id: 'sleep-habit',
    situation:
      '밤에 함께 자고 있는데, 한 사람이\n자는 동안 코를 골거나 잠꼬대를 해요.',
    scene: sceneSleep,
    situationScene: { src: situationSleep, tone: 'dark' },
    layout: 'default',
    self: {
      text: '나는 코골이, 잠꼬대 같은 잠버릇이\n어느 정도 있는 편인가요?',
      options: [
        '자주 있다는 말을 들었다',
        '가끔 있다는 말을 들었다',
        '예전에 한두 번 들은 적 있다',
        '없다는 말을 들었다',
        '잘 모르겠다',
      ],
    },
    roommate: {
      text: '룸메이트의 코골이, 잠꼬대는\n어느 정도까지 괜찮을까요?',
      options: [
        '자주 있어도 괜찮다',
        '가끔 있는 정도는 괜찮다',
        '거의 없는 편이면 괜찮다',
        '없었으면 좋겠다',
      ],
    },
  },
  {
    id: 'bedtime',
    situation:
      '밤 12시가 되었어요. 한 사람은 자려고 하고,\n다른 한 사람은 아직 잠들지 않았어요.',
    scene: sceneBedtime,
    situationScene: { src: situationBedtime, tone: 'light' },
    layout: 'default',
    self: {
      text: '평일에 나는 보통 몇 시쯤 잠자리에 드나요?',
      options: [
        '밤 10시 이전',
        '밤 10시~12시',
        '새벽 12시~2시',
        '새벽 2시 이후',
        '일정하지 않다',
      ],
    },
    roommate: {
      text: '룸메이트가 방 안에서 깨어 있어도 괜찮은\n마감 시간은 언제까지인가요?',
      options: [
        '밤 11시까지',
        '밤 12시까지',
        '새벽 1시까지',
        '새벽 2시까지',
        '큰 소음이 아니라면 상관없다',
      ],
    },
  },
  {
    id: 'morning-alarm',
    situation:
      '아침 7시, 알람이 울렸어요. 그런데 알람이\n한 번으로 끝나지 않고 여러 번 반복돼요.',
    scene: sceneAlarm,
    layout: 'default',
    self: {
      text: '나는 아침에 알람을 보통\n어떻게 사용하는 편인가요?',
      options: [
        '첫 알람에 바로 일어난다',
        '2번 이내로 끄고 일어난다',
        '3~4번 정도 반복한다',
        '5번 이상 반복하는 편이다',
        '알람을 거의 사용하지 않는다',
      ],
    },
    roommate: {
      text: '룸메이트의 알람은 어디까지 괜찮을까요?',
      options: [
        '여러 번 울려도 괜찮다',
        '3~4번까지는 괜찮다',
        '2번 정도까지만 괜찮다',
        '한 번만 울렸으면 좋겠다',
      ],
    },
  },
  {
    id: 'floor-cleaning',
    situation: '방 바닥에 머리카락이나 먼지가\n조금씩 보이기 시작했어요.',
    scene: sceneFloor,
    layout: 'default',
    self: {
      text: '나는 방 바닥을 보통 얼마나\n자주 청소하나요?',
      options: [
        '거의 매일 한다',
        '주 2~3회 한다',
        '주 1회 한다',
        '2주에 1회 정도 한다',
        '더 드물게 한다',
      ],
    },
    roommate: {
      text: '룸메이트는 최소 어느 정도로\n바닥 청소를 해주면 괜찮을까요?',
      options: [
        '거의 매일 한다',
        '주 2~3회 한다',
        '주 1회면 괜찮다',
        '2주 1회면 괜찮다',
        '필요할 때만 해도 괜찮다',
      ],
    },
  },
  {
    id: 'food-waste',
    situation:
      '배달 음식을 먹고 남은 음식과 용기가\n방 안에 있어요. 아직 냄새가 심하게 나지는 않아요',
    scene: sceneFood,
    layout: 'default',
    self: {
      text: '먹다 남긴 음식이나 냄새날 수 있는\n쓰레기는 보통 언제 치우나요?',
      options: [
        '먹은 직후 바로 치운다',
        '그날 안에 치운다',
        '다음 날 치우기도 한다',
        '이틀 이상 두는 경우도 있다',
        '방에서 음식을 먹지 않는다',
      ],
    },
    roommate: {
      text: '룸메이트가 먹다 남긴 음식이나 냄새나는\n쓰레기를 두었다면 언제까지 괜찮을까요?',
      options: [
        '먹은 직후 바로 치워줬으면 좋겠다',
        '그날 안에만 치우면 괜찮다',
        '다음 날까지는 괜찮다',
        '냄새나 위생 문제가 없다면 더 두어도 괜찮다',
      ],
    },
  },
  {
    id: 'belongings',
    situation: '옷과 가방, 책 같은 개인 물건이\n방 안에 꺼내져 있어요.',
    scene: sceneBelongings,
    layout: 'default',
    self: {
      text: '나는 개인 물건을 사용한 뒤\n보통 언제 정리하나요?',
      options: [
        '바로 정리한다',
        '그날 안에 정리한다',
        '며칠 모아두었다가 정리한다',
        '크게 신경 쓰지 않고 필요할 때 정리한다',
      ],
    },
    roommate: {
      text: '룸메이트가 개인 물건을 꺼내놓는 것은\n어디까지 괜찮을까요?',
      options: [
        '바로 정리했으면 좋겠다',
        '그날 안에는 정리했으면 좋겠다',
        '며칠 정도는 괜찮다',
        '내 공간만 침범하지 않으면 괜찮다',
      ],
    },
  },
  {
    id: 'dishes',
    situation: '방 안 책상 위에 사용한 컵이나 그릇 같은\n식기가 놓여 있어요.',
    scene: sceneDishes,
    layout: 'default',
    self: {
      text: '나는 사용한 컵이나 식기를 보통\n언제 정리하나요?',
      options: [
        '사용 직후 바로 정리한다',
        '그날 안에 정리한다',
        '다음 날 정리하기도 한다',
        '이틀 이상 두는 경우도 있다',
        '방에서 식기를 거의 사용하지 않는다',
      ],
    },
    roommate: {
      text: '룸메이트가 사용한 컵이나 식기를\n방 안에 두고 있다면 언제까지 괜찮을까요?',
      options: [
        '사용 직후 바로 정리했으면 좋겠다',
        '그날 안에만 정리하면 괜찮다',
        '다음 날까지는 괜찮다',
        '위생 문제가 없다면 더 두어도 괜찮다',
      ],
    },
  },
  {
    id: 'smoking',
    situation:
      '룸메이트가 밖에서 담배를 피우고 방으로\n돌아왔어요. 냄새가 날 수 있어요.',
    scene: sceneSmoking,
    layout: 'compact',
    self: {
      text: '나는 흡연과 관련해 어느 쪽에\n해당하나요?',
      options: [
        '비흡연자다',
        '흡연자이지만 기숙사에서는 자제할 예정이다',
        '흡연하며 지정된 실외 장소를 이용할 예정이다',
      ],
    },
    roommate: {
      text: '룸메이트의 흡연은 어느 정도까지\n괜찮을까요?',
      options: [
        '흡연 여부는 상관없다',
        '실외에서만 하고 냄새가 거의 없으면 괜찮다',
        '가능한 비흡연자였으면 좋겠다',
        '흡연자와는 같은 방이 어렵다',
      ],
    },
  },
]

/** Two questions per topic, so Q1 and Q2 are topic 0, Q3 and Q4 are topic 1, and so on. */
export const QUESTION_COUNT = QUESTION_TOPICS.length * 2

export function getQuestionStep(index: number) {
  const topic = QUESTION_TOPICS[Math.floor(index / 2)]
  const isSelf = index % 2 === 0
  return { topic, isSelf, question: isSelf ? topic.self : topic.roommate }
}
