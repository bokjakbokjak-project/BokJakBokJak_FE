import { screen } from '@testing-library/react'
import { QUESTION_COUNT, getQuestionStep } from '../pages/question/questionData'

/**
 * The question index (0-15, the key of its answer) of the question on screen, read from its
 * heading. The survey asks the topics in the priority order, so the step is not the index.
 */
export function shownQuestionIndex() {
  const text = screen.getByRole('heading', {
    level: 1,
    hidden: true,
  }).textContent
  for (let index = 0; index < QUESTION_COUNT; index += 1) {
    if (getQuestionStep(index).question.text === text) return index
  }
  throw new Error(`No question has the heading ${String(text)}`)
}

/** The question on screen (topic, self or roommate, text and options). */
export const shownQuestion = () => getQuestionStep(shownQuestionIndex())
