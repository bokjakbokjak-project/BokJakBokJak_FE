import { useEffect } from 'react'
import { isUserTestEnabled } from './config'
import { usesServerData } from './experience'
import { queuePrompt } from './feedback'
import type { QuestionId } from './userTestStore'

/**
 * Queues a feedback question once the content it asks about is on screen (`ready`), for the
 * next screen to ask. The data source is a snapshot: real data, or the browse mode's examples.
 */
export function useQueuePrompt(
  questionId: QuestionId,
  targetProfileId: string | null,
  ready: boolean,
) {
  useEffect(() => {
    if (!ready || !isUserTestEnabled()) return
    queuePrompt(
      questionId,
      targetProfileId,
      usesServerData() ? 'real' : 'example',
    )
  }, [questionId, targetProfileId, ready])
}
