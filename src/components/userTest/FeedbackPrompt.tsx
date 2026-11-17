import { useEffect, useState } from 'react'
import { isUserTestEnabled } from '../../lib/userTest/config'
import {
  finishPrompt,
  retryDeliveries,
  showNextPrompt,
} from '../../lib/userTest/feedback'
import type {
  FeedbackRecord,
  QuestionId,
} from '../../lib/userTest/userTestStore'
import FeedbackSheet from './FeedbackSheet'

/**
 * Put on a screen that is a natural stop. When the screen opens it shows the first queued
 * question of `allowed`, at most one per screen entry, and tries again any answer that was not
 * delivered. Nothing shows outside the user test build.
 */
export default function FeedbackPrompt({
  allowed,
  answeredCount = 0,
  ready = true,
}: {
  allowed: readonly QuestionId[]
  /** Survey answers so far, for the `survey_status` snapshot. */
  answeredCount?: number
  /** False while the screen is still loading, so the sheet waits for it. */
  ready?: boolean
}) {
  const [record, setRecord] = useState<FeedbackRecord | null>(null)
  const allowedKey = allowed.join(',')

  useEffect(() => {
    if (!ready || !isUserTestEnabled()) return
    retryDeliveries()
    // Read after the screen settles, so a queue set by the screen being left is included.
    const timer = setTimeout(() => {
      setRecord(
        showNextPrompt(allowedKey.split(',') as QuestionId[], answeredCount),
      )
    }, 0)
    return () => clearTimeout(timer)
    // Once per screen entry; the count only matters at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, allowedKey])

  if (!record) return null
  return (
    <FeedbackSheet
      key={record.questionId}
      record={record}
      onAnswer={(optionId, comment) => {
        finishPrompt(record.questionId, { optionId, comment })
        setRecord(null)
      }}
      onSkip={() => {
        finishPrompt(record.questionId, null)
        setRecord(null)
      }}
    />
  )
}
