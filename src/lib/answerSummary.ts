import type { CategoryId } from './onboarding/categories'
import { QUESTION_TOPICS } from '../pages/question/questionData'
import type { QuestionAnswers } from '../pages/question/questionState'

type AnswerGroup = {
  category: CategoryId
  /** Card title in the my page frames (1532:20013), which differ from the onboarding labels. */
  title: string
  topicIds: readonly string[]
}

/**
 * The five cards of the my page and the survey topics under each one. The grouping follows the
 * numbered survey text in Figma 853:5118 (1 잠버릇, 2-3 기상/알람, 청소 청결 twice, 6-7 개인 청결,
 * 8 흡연 여부), and the card count matches the `1/2` pagers in 1532:19717.
 */
export const ANSWER_GROUPS: readonly AnswerGroup[] = [
  { category: 'sleep-habit', title: '잠버릇', topicIds: ['sleep-habit'] },
  {
    category: 'wake-alarm',
    title: '기상알람',
    topicIds: ['bedtime', 'morning-alarm'],
  },
  {
    category: 'cleaning',
    title: '청소 청결',
    topicIds: ['floor-cleaning', 'food-waste'],
  },
  {
    category: 'personal-hygiene',
    title: '개인 청결',
    topicIds: ['belongings', 'dishes'],
  },
  { category: 'smoking', title: '흡연유무', topicIds: ['smoking'] },
]

export type AnswerItem = {
  topicId: string
  /** The self question of the topic, as asked in the survey. */
  question: string
  /** Answer to the self question, or null if it is not answered yet. */
  mine: string | null
  /** Answer to the roommate question, or null if it is not answered yet. */
  wanted: string | null
}

export type AnswerSummaryCard = Omit<AnswerGroup, 'topicIds'> & {
  items: AnswerItem[]
}

/** Answers are stored by question index: topic n has the self answer at 2n, the roommate at 2n+1. */
export function getAnswerSummary(
  answers: QuestionAnswers,
): AnswerSummaryCard[] {
  return ANSWER_GROUPS.map(({ topicIds, ...group }) => ({
    ...group,
    items: topicIds.map((topicId) => {
      const index = QUESTION_TOPICS.findIndex(({ id }) => id === topicId)
      if (index === -1) throw new Error(`Unknown survey topic: ${topicId}`)
      return {
        topicId,
        question: QUESTION_TOPICS[index].self.text,
        mine: answers[index * 2] ?? null,
        wanted: answers[index * 2 + 1] ?? null,
      }
    }),
  }))
}
