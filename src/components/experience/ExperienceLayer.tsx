import { useEffect } from 'react'
import { Outlet } from 'react-router'
import { isExperienceMode } from '../../lib/experience/mode'
import { EXPERIENCE_PROFILE } from '../../lib/experience/profile'
import {
  getExperienceSession,
  updateExperienceSession,
} from '../../lib/experience/session'
import { useOnboarding } from '../../lib/onboarding/onboardingState'
import { useQuestion } from '../../pages/question/questionState'
import PresenterMenu from './PresenterMenu'

/**
 * Inside the session providers, in the experience mode only:
 *
 * - A reload drops the in-memory onboarding and survey answers, so they are put back from the
 *   experience session before any screen (and its step guard) renders: the reload recovers
 *   the experience instead of sending it to the school step.
 * - The priorities and answers given from then on are kept in the session.
 * - The presenter menu (처음부터, 다음 참가자, 장면 이동).
 */
export default function ExperienceLayer() {
  if (!isExperienceMode()) return <Outlet />
  return <ExperienceRestore />
}

function ExperienceRestore() {
  const { data, update } = useOnboarding()
  const { answers, replaceAnswers } = useQuestion()
  // The shared name is set with the rest, so it tells whether the answers are back.
  const restored = data.name !== ''

  useEffect(() => {
    if (restored) return
    const session = getExperienceSession()
    update({ ...EXPERIENCE_PROFILE, priorities: session?.priorities ?? [] })
    if (session && Object.keys(session.answers).length > 0) {
      replaceAnswers(session.answers)
    }
  }, [restored, update, replaceAnswers])

  const priorities = data.priorities.join()
  useEffect(() => {
    if (!restored) return
    updateExperienceSession((session) =>
      session.priorities.join() === priorities
        ? session
        : { ...session, priorities: [...data.priorities] },
    )
    // The joined string stands for the array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, priorities])

  useEffect(() => {
    if (!restored) return
    updateExperienceSession((session) =>
      JSON.stringify(session.answers) === JSON.stringify(answers)
        ? session
        : { ...session, answers: { ...answers } },
    )
  }, [restored, answers])

  if (!restored) return null
  return (
    <>
      <Outlet />
      <PresenterMenu />
    </>
  )
}
