import type { CategoryId } from './onboarding/categories'
import { QUESTION_TOPICS } from '../pages/question/questionData'
import type { QuestionAnswers } from '../pages/question/questionState'

type AnswerGroup = {
  category: CategoryId
  /** Card title in the my page frames (1532:20013), which differ from the onboarding labels. */
  title: string
  /** Row label in the detail profile sections (Figma 2339:27404). */
  label: string
  topicIds: readonly string[]
}

/**
 * The answer groups and the survey topics under each one, in the order of the detail profile
 * rows (Figma 2339:27404): 잠버릇, 기상알람 (bedtime and alarm), 청소 (floor and food waste),
 * 개인물건, 온도, 흡연. 온도 took the dishes question's place in the survey (2026-11-19), so the
 * rows follow the survey order and 온도 comes before 흡연.
 */
export const ANSWER_GROUPS: readonly AnswerGroup[] = [
  {
    category: 'sleep-habit',
    title: '잠버릇',
    label: '잠버릇',
    topicIds: ['sleep-habit'],
  },
  {
    category: 'wake-alarm',
    title: '기상알람',
    label: '기상알람',
    topicIds: ['bedtime', 'morning-alarm'],
  },
  {
    category: 'cleaning',
    title: '청소 청결',
    label: '청소',
    topicIds: ['floor-cleaning', 'food-waste'],
  },
  {
    category: 'personal-hygiene',
    title: '개인 청결',
    label: '개인물건',
    topicIds: ['belongings'],
  },
  {
    category: 'temperature',
    title: '온도',
    label: '온도',
    topicIds: ['temperature'],
  },
  {
    category: 'smoking',
    title: '흡연유무',
    label: '흡연',
    topicIds: ['smoking'],
  },
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

export type AnswerSummaryCard = Omit<AnswerGroup, 'topicIds' | 'label'> & {
  items: AnswerItem[]
}

/** Answers are stored by question index: topic n has the self answer at 2n, the roommate at 2n+1. */
export function getAnswerSummary(
  answers: QuestionAnswers,
): AnswerSummaryCard[] {
  return ANSWER_GROUPS.map(({ topicIds, category, title }) => ({
    category,
    title,
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
