import { createContext, useContext } from 'react'

/** Chosen option per question index, 0-15. Missing means not answered yet. */
export type QuestionAnswers = Readonly<Record<number, string>>

type QuestionContextValue = {
  answers: QuestionAnswers
  answer: (index: number, option: string) => void
  /** Kept here so the profile's back button returns to the last question. */
  index: number
  setIndex: (index: number) => void
}

export const QuestionContext = createContext<QuestionContextValue | null>(null)

export function useQuestion() {
  const value = useContext(QuestionContext)
  if (!value) {
    throw new Error('useQuestion must be used inside QuestionProvider')
  }
  return value
}
