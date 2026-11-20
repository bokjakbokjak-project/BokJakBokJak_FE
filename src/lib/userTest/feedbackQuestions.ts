import type { DataSource, QuestionId } from './userTestStore'

/**
 * The three feedback questions of the user test, word for word from the request (2026-11-17).
 * Options are kinds of experience, not a scale: they are never averaged as 1 to 4.
 */

export type FeedbackOption = { id: string; label: string }

export type FeedbackQuestion = {
  title: string
  options: FeedbackOption[]
  commentPrompt: string
}

export const FEEDBACK_HEADING = '잠깐, 이 과정은 어땠나요?'
export const COMMENT_MAX_LENGTH = 500

const Q1: FeedbackQuestion = {
  title:
    '설문을 하면서, 룸메이트를 구할 때 확인하고 싶은 부분이 더 떠올랐나요?',
  options: [
    { id: 'new_criteria', label: '새롭게 확인하고 싶은 부분이 생겼어요' },
    {
      id: 'organized_existing',
      label: '이미 생각했던 부분을 정리할 수 있었어요',
    },
    { id: 'no_change', label: '특별히 달라진 점은 없어요' },
    { id: 'missing_topics', label: '제가 확인하고 싶은 내용이 부족했어요' },
  ],
  commentPrompt: '새롭게 떠올랐거나 빠져 있다고 느낀 내용이 있다면 알려주세요.',
}

const Q2_OPTIONS: FeedbackOption[] = [
  { id: 'clear', label: '구체적으로 그려져요' },
  { id: 'somewhat_clear', label: '어느 정도 그려져요' },
  { id: 'unclear', label: '잘 그려지지 않아요' },
  { id: 'very_unclear', label: '전혀 그려지지 않아요' },
]
const Q2_COMMENT = '아직 모호하거나 더 물어보고 싶은 부분이 있나요?'

const Q2_REAL: FeedbackQuestion = {
  title: '이 프로필을 보고, 상대가 실제로 어떻게 생활하는지 얼마나 그려지나요?',
  options: Q2_OPTIONS,
  commentPrompt: Q2_COMMENT,
}

const Q2_EXAMPLE: FeedbackQuestion = {
  title: '이 예시 프로필을 보고, 상대가 어떻게 생활하는지 얼마나 그려지나요?',
  options: Q2_OPTIONS,
  commentPrompt: Q2_COMMENT,
}

const Q3_REAL: FeedbackQuestion = {
  title: '이 상대와 함께 살기 전에, 어떤 부분을 이야기해봐야 할지 알겠나요?',
  options: [
    {
      id: 'topics_and_range',
      label: '이야기할 부분과 제가 양보할 수 있는 범위까지 알겠어요',
    },
    {
      id: 'topics_only',
      label: '이야기할 부분은 알겠지만, 어디까지 양보할지는 모르겠어요',
    },
    { id: 'unclear_topics', label: '무엇을 이야기해야 할지 아직 모르겠어요' },
    {
      id: 'no_adjustment_needed',
      label: '따로 조율할 부분이 없다고 느껴져요',
    },
  ],
  commentPrompt: '함께 살기 전에 어떤 이야기를 먼저 나누고 싶나요?',
}

const Q3_EXAMPLE: FeedbackQuestion = {
  title: '예시 화면에서 두 사람이 어떤 부분을 이야기해봐야 할지 알겠나요?',
  options: [
    {
      id: 'topics_and_range',
      label: '이야기할 부분과 서로 양보할 수 있는 범위까지 알겠어요',
    },
    {
      id: 'topics_only',
      label: '이야기할 부분은 알겠지만, 어디까지 양보할지는 모르겠어요',
    },
    { id: 'unclear_topics', label: '무엇을 이야기해야 할지 아직 모르겠어요' },
    {
      id: 'no_adjustment_needed',
      label: '따로 조율할 부분이 없다고 느껴져요',
    },
  ],
  commentPrompt:
    '예시 속 두 사람이 함께 살기 전에 어떤 이야기를 먼저 나누면 좋을까요?',
}

export function getFeedbackQuestion(
  questionId: QuestionId,
  source: DataSource,
): FeedbackQuestion {
  switch (questionId) {
    case 'q1_discovery':
      return Q1
    case 'q2_understanding':
      return source === 'example' ? Q2_EXAMPLE : Q2_REAL
    case 'q3_negotiation':
      return source === 'example' ? Q3_EXAMPLE : Q3_REAL
  }
}
