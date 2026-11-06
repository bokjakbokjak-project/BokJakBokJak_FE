import { useCallback, useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import { QuestionContext, type QuestionAnswers } from './questionState'

/** Keeps answers in memory only. Saving is not agreed yet (OPEN_QUESTIONS BE-9). */
export default function QuestionProvider() {
  const [answers, setAnswers] = useState<QuestionAnswers>({})
  const [index, setIndex] = useState(0)
  const answer = useCallback((question: number, option: string) => {
    setAnswers((current) => ({ ...current, [question]: option }))
  }, [])
  const value = useMemo(
    () => ({ answers, answer, index, setIndex }),
    [answers, answer, index],
  )

  return (
    <QuestionContext.Provider value={value}>
      <Outlet />
    </QuestionContext.Provider>
  )
}
