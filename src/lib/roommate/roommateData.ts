import avatarCheckPillow from '../../assets/roommate/avatar-check-pillow.png'
import avatarCheck from '../../assets/roommate/avatar-check.png'
import avatarMask from '../../assets/roommate/avatar-mask.png'
import avatarSleep from '../../assets/roommate/avatar-sleep.png'
import { QUESTION_TOPICS } from '../../pages/question/questionData'

/**
 * Sample data for the frontend demo. There is no recommendation API or matching algorithm yet,
 * so nothing here is calculated. The first six candidates' names and rates come from the Figma
 * frames, and everything else is fictional and written by hand. Replace these functions with API calls (OPEN_QUESTIONS RM-1 to RM-3).
 */

/** Card colors by priority rank, from the Figma frames named "N순위(프레임 색 구별)". */
export type AnswerTone = 'rank1' | 'rank2' | 'rank3' | 'rest'

export type AnswerRow = {
  id: string
  /** Includes the question number. Line breaks are kept. */
  question: string
  selfAnswer: string
  partnerAnswer: string
  tone: AnswerTone
}

export type MatchAnalysis = {
  good: readonly string[]
  adjust: readonly string[]
  check: readonly string[]
}

export type RoommateCandidate = {
  id: string
  name: string
  /** Used in "수정님과의 나의 매칭결과". */
  givenName: string
  age: number
  department: string
  matchRate: number
  avatar: string
  analysis: MatchAnalysis
  answers: readonly AnswerRow[]
}

/** The Figma list shows five cards before `+더보기`. */
export const CANDIDATES_PER_PAGE = 5

const TONES: readonly AnswerTone[] = [
  'rank1',
  'rank2',
  'rank2',
  'rank2',
  'rank3',
  'rest',
  'rest',
  'rest',
]

/** The Figma frame 1057:11619 as drawn. Its differences from the survey are in OPEN_QUESTIONS DE-R1. */
const FIGMA_SAMPLE_ANSWERS: readonly AnswerRow[] = [
  {
    id: 'figma-1',
    question:
      'Q1. 나는 코골이, 잠꼬대 같은 잠버릇이 어느 정도 있는\n 편인가요?',
    selfAnswer: '자주 있다는 말을 들었다',
    partnerAnswer: '가끔 있는 정도는 괜찮다',
    tone: 'rank1',
  },
  {
    id: 'figma-2',
    question: 'Q2. 평일에 나는 보통 몇 시쯤 잠자리에 드나요?',
    selfAnswer: '밤 11시~12시',
    partnerAnswer: '밤 12시까지',
    tone: 'rank2',
  },
  {
    id: 'figma-3',
    question: 'Q3. 아침에 알람을 보통 어떻게 사용하는 편인가요?',
    selfAnswer: '첫 알람에 바로 일어난다',
    partnerAnswer: '한 번만 울렸으면 좋겠다',
    tone: 'rank2',
  },
  {
    id: 'figma-4',
    question: 'Q2. 평일에 나는 보통 몇 시쯤 잠자리에 드나요?',
    selfAnswer: '밤 11시~12시',
    partnerAnswer: '밤 12시까지',
    tone: 'rank2',
  },
  {
    id: 'figma-5',
    question:
      'Q5. 먹다 남긴 음식이나 냄새날 수 있는 쓰레기는 보통\n 언제 치우나요?',
    selfAnswer: '첫 알람에 바로 일어난다',
    partnerAnswer: '한 번만 울렸으면 좋겠다',
    tone: 'rank3',
  },
  {
    id: 'figma-6',
    question: 'Q6. 개인 물건을 사용한 뒤 보통 언제 정리하나요?',
    selfAnswer: '그날 안에 정리한다',
    partnerAnswer: '위생 문제가 없다면 더 두어도 괜찮다',
    tone: 'rest',
  },
  {
    id: 'figma-7',
    question: 'Q7. 사용한 컵이나 식기를 보통 언제 정리하나요?',
    selfAnswer: '사용 직후 바로 치운다',
    partnerAnswer: '위생 문제가 없다면 더 두어도 괜찮다',
    tone: 'rest',
  },
  {
    id: 'figma-8',
    question: 'Q8. 흡연과 관련해 어느 쪽에 해당하나요?',
    selfAnswer: '먹은 직후 바로 치운다',
    partnerAnswer: '그날 안에만 치우면 괜찮다',
    tone: 'rest',
  },
]

/** Builds rows from the real survey, using option positions: [self, roommate] per topic. */
function surveyAnswers(
  picks: readonly (readonly [number, number])[],
): readonly AnswerRow[] {
  return QUESTION_TOPICS.map((topic, index) => ({
    id: topic.id,
    question: `Q${index + 1}. ${topic.self.text.replace('\n', ' ')}`,
    selfAnswer: topic.self.options[picks[index][0]],
    partnerAnswer: topic.roommate.options[picks[index][1]],
    tone: TONES[index],
  }))
}

const CANDIDATES: readonly RoommateCandidate[] = [
  {
    id: 'sujeong',
    name: '민수정',
    givenName: '수정',
    age: 21,
    department: '소프트웨어학과',
    matchRate: 87,
    avatar: avatarSleep,
    // Copy as drawn in Figma 1057:12630, including the names (OPEN_QUESTIONS DE-R2).
    analysis: {
      good: [
        '방 안 통화는 밖에서 하길 원해요.',
        '주 1회 함께 청소하길 원해요.',
      ],
      adjust: [
        '모아님은 시험기간에 늦게 공부해요.',
        '수연님은 잠들 때 빛이 신경 쓰여요.',
      ],
      check: ['모아님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: FIGMA_SAMPLE_ANSWERS,
  },
  {
    id: 'seoyun',
    name: '이서윤',
    givenName: '서윤',
    age: 23,
    department: '디자인학과',
    matchRate: 86,
    avatar: avatarSleep,
    analysis: {
      good: [
        '평일에 비슷한 시간대에 잠자리에 들어요.',
        '주 1회 청소를 선호해요.',
      ],
      adjust: ['서윤님은 알람을 두 번까지 맞춰요.'],
      check: ['서윤님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: surveyAnswers([
      [4, 1],
      [1, 1],
      [1, 2],
      [2, 2],
      [1, 1],
      [1, 1],
      [1, 1],
      [0, 0],
    ]),
  },
  {
    id: 'yujeong',
    name: '서유정',
    givenName: '유정',
    age: 25,
    department: '헤어메이크업학과',
    matchRate: 83,
    avatar: avatarSleep,
    analysis: {
      good: ['개인 물건을 그날 안에 정리해요.'],
      adjust: ['유정님은 자정 넘어 잠드는 편이에요.'],
      check: ['유정님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: surveyAnswers([
      [4, 1],
      [2, 2],
      [2, 1],
      [1, 1],
      [0, 0],
      [1, 1],
      [0, 0],
      [0, 0],
    ]),
  },
  {
    id: 'hyena',
    name: '김혜나',
    givenName: '혜나',
    age: 25,
    department: '전자공학과',
    matchRate: 75,
    avatar: avatarMask,
    analysis: {
      good: ['첫 알람에 바로 일어나요.'],
      adjust: ['혜나님은 청소를 2주에 한 번 정도 해요.'],
      check: ['혜나님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: surveyAnswers([
      [4, 0],
      [1, 3],
      [0, 3],
      [3, 3],
      [2, 2],
      [2, 2],
      [2, 2],
      [0, 0],
    ]),
  },
  {
    id: 'hyeyun',
    name: '전혜윤',
    givenName: '혜윤',
    age: 20,
    department: '일본어어학과',
    matchRate: 71,
    avatar: avatarCheck,
    analysis: {
      good: ['식기를 사용한 뒤 바로 정리해요.'],
      adjust: ['혜윤님은 알람을 5번 이상 반복해요.'],
      check: ['혜윤님은 취침 시간이 일정하지 않아요.'],
    },
    answers: surveyAnswers([
      [2, 2],
      [4, 0],
      [3, 1],
      [2, 2],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 2],
    ]),
  },
  {
    id: 'yungyeong',
    name: '남윤경',
    givenName: '윤경',
    age: 23,
    department: '신학과',
    matchRate: 69,
    avatar: avatarCheckPillow,
    analysis: {
      good: ['흡연 여부에 대한 생각이 비슷해요.'],
      adjust: ['윤경님은 바닥 청소를 거의 매일 해요.'],
      check: ['윤경님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: surveyAnswers([
      [4, 3],
      [1, 0],
      [0, 3],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 2],
    ]),
  },
  {
    id: 'jimin',
    name: '박지민',
    givenName: '지민',
    age: 22,
    department: '경영학과',
    matchRate: 67,
    avatar: avatarSleep,
    analysis: {
      good: ['개인 물건을 사용한 뒤 바로 정리해요.'],
      adjust: ['지민님은 룸메이트의 알람이 2번까지면 좋겠어요.'],
      check: ['지민님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: surveyAnswers([
      [4, 1],
      [1, 1],
      [0, 2],
      [2, 2],
      [1, 1],
      [0, 0],
      [1, 1],
      [0, 2],
    ]),
  },
  {
    id: 'haeun',
    name: '최하은',
    givenName: '하은',
    age: 21,
    department: '간호학과',
    matchRate: 66,
    avatar: avatarMask,
    analysis: {
      good: ['식기를 사용한 뒤 바로 정리해요.'],
      adjust: ['하은님은 밤 10시 이전에 잠자리에 들어요.'],
      check: ['하은님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: surveyAnswers([
      [4, 2],
      [0, 0],
      [1, 2],
      [1, 1],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 3],
    ]),
  },
  {
    id: 'daeun',
    name: '정다은',
    givenName: '다은',
    age: 24,
    department: '심리학과',
    matchRate: 64,
    avatar: avatarCheck,
    analysis: {
      good: ['개인 물건을 그날 안에 정리해요.'],
      adjust: ['다은님은 알람을 3~4번 반복해요.'],
      check: ['다은님은 취침 시간이 일정하지 않아요.'],
    },
    answers: surveyAnswers([
      [1, 1],
      [4, 4],
      [2, 1],
      [2, 3],
      [1, 2],
      [1, 2],
      [1, 2],
      [0, 0],
    ]),
  },
  {
    id: 'yerin',
    name: '강예린',
    givenName: '예린',
    age: 20,
    department: '유아교육과',
    matchRate: 62,
    avatar: avatarCheckPillow,
    analysis: {
      good: ['알람을 거의 사용하지 않아요.'],
      adjust: ['예린님은 바닥 청소를 2주에 1회 정도 해요.'],
      check: ['예린님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: surveyAnswers([
      [4, 1],
      [1, 2],
      [4, 0],
      [3, 3],
      [4, 2],
      [1, 1],
      [4, 2],
      [0, 2],
    ]),
  },
  {
    id: 'sohee',
    name: '윤소희',
    givenName: '소희',
    age: 26,
    department: '화학공학과',
    matchRate: 60,
    avatar: avatarSleep,
    analysis: {
      good: ['바닥 청소를 주 1회 해요.'],
      adjust: ['소희님은 음식물 쓰레기를 다음 날 치우기도 해요.'],
      check: ['소희님은 취침 시간이 일정하지 않아요.'],
    },
    answers: surveyAnswers([
      [2, 2],
      [4, 1],
      [1, 2],
      [2, 2],
      [2, 2],
      [2, 2],
      [2, 2],
      [1, 1],
    ]),
  },
  {
    id: 'jiwoo',
    name: '한지우',
    givenName: '지우',
    age: 22,
    department: '사회복지학과',
    matchRate: 58,
    avatar: avatarMask,
    analysis: {
      good: ['식기를 그날 안에 정리해요.'],
      adjust: ['지우님은 자정 넘어 잠드는 편이에요.'],
      check: ['지우님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: surveyAnswers([
      [4, 2],
      [2, 3],
      [2, 1],
      [3, 4],
      [1, 1],
      [3, 3],
      [1, 1],
      [0, 1],
    ]),
  },
  {
    id: 'subin',
    name: '오수빈',
    givenName: '수빈',
    age: 23,
    department: '식품영양학과',
    matchRate: 57,
    avatar: avatarCheck,
    analysis: {
      good: ['첫 알람에 바로 일어나요.'],
      adjust: ['수빈님은 바닥 청소를 거의 매일 해요.'],
      check: ['수빈님은 취침 시간이 일정하지 않아요.'],
    },
    answers: surveyAnswers([
      [3, 3],
      [4, 0],
      [0, 3],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 3],
    ]),
  },
  {
    id: 'chaewon',
    name: '임채원',
    givenName: '채원',
    age: 25,
    department: '컴퓨터공학과',
    matchRate: 55,
    avatar: avatarCheckPillow,
    analysis: {
      good: ['코골이와 잠꼬대를 크게 신경 쓰지 않아요.'],
      adjust: ['채원님은 새벽 2시 이후에 잠자리에 들어요.'],
      check: ['채원님은 자신의 코골이 여부를 몰라요.'],
    },
    answers: surveyAnswers([
      [4, 0],
      [3, 4],
      [3, 0],
      [4, 4],
      [2, 3],
      [3, 3],
      [3, 3],
      [2, 0],
    ]),
  },
  {
    id: 'gaeun',
    name: '송가은',
    givenName: '가은',
    age: 21,
    department: '영어영문학과',
    matchRate: 52,
    avatar: avatarSleep,
    analysis: {
      good: ['기숙사에서는 흡연을 자제할 예정이에요.'],
      adjust: ['가은님은 잠버릇이 자주 있다는 말을 들었어요.'],
      check: ['가은님은 취침 시간이 일정하지 않아요.'],
    },
    answers: surveyAnswers([
      [0, 0],
      [4, 2],
      [3, 1],
      [3, 3],
      [3, 3],
      [2, 2],
      [3, 3],
      [1, 1],
    ]),
  },
]

export function getCandidates() {
  return CANDIDATES
}

export function getCandidate(id: string | undefined) {
  return CANDIDATES.find((candidate) => candidate.id === id)
}
