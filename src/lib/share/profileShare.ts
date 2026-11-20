import { CATEGORY_IDS, type CategoryId } from '../onboarding/categories'
import {
  QUESTION_COUNT,
  getQuestionStep,
} from '../../pages/question/questionData'
import type { QuestionAnswers } from '../../pages/question/questionState'

/**
 * What the shared survey result shows (QA 15, Figma section 1952:39743). Figma leaves the age
 * out, and the receiver has no match rate, so neither is in the link.
 */
export type SharedProfile = {
  name: string
  department: string
  priorities: CategoryId[]
  answers: QuestionAnswers
}

export const SHARE_ROUTE = '/share'

// There is no server to keep a shared profile, so the link carries it in the hash. The hash is
// not sent to the server, and answers travel as option numbers (question OPEN_QUESTIONS PL-7).
// Older links keep working, with their answers moved to where those questions are now:
// - Version 1: questions 13·14 were dishes (removed, so left out) and 15·16 smoking.
// - Version 2 (2026-11-19): 13·14 were 온도 and 15·16 smoking.
// - Version 3 (2026-11-20): the backend's order, 13·14 smoking and 15·16 온도.
type Payload = {
  v: 1 | 2 | 3
  n: string
  d: string
  p: CategoryId[]
  a: number[]
}

const SHARE_VERSION = 3

/** Screen index today of an answer at `index` in a link of `version`, or null if dropped. */
function currentIndex(version: 1 | 2 | 3, index: number): number | null {
  if (version === 3 || index < 12) return index
  if (version === 1) return index < 14 ? null : index - 2
  return index < 14 ? index + 2 : index - 2
}

function toBase64Url(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string) {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

/** The link to the shared result. Unanswered questions are left out of the link. */
export function createShareUrl(profile: SharedProfile, origin: string) {
  const payload: Payload = {
    v: SHARE_VERSION,
    n: profile.name,
    d: profile.department,
    p: profile.priorities,
    a: Array.from({ length: QUESTION_COUNT }, (_, index) => {
      const answer = profile.answers[index]
      return answer === undefined
        ? -1
        : getQuestionStep(index).question.options.indexOf(answer)
    }),
  }
  return `${origin}${SHARE_ROUTE}#${toBase64Url(JSON.stringify(payload))}`
}

/** Reads the hash of a share link. Anything malformed or from another version gives null. */
export function readSharedProfile(hash: string): SharedProfile | null {
  try {
    const payload = JSON.parse(fromBase64Url(hash.replace(/^#/, ''))) as Payload
    if (
      (payload?.v !== 1 && payload?.v !== 2 && payload?.v !== SHARE_VERSION) ||
      typeof payload.n !== 'string' ||
      typeof payload.d !== 'string' ||
      !Array.isArray(payload.p) ||
      !Array.isArray(payload.a) ||
      payload.a.length !== QUESTION_COUNT
    ) {
      return null
    }
    const answers: Record<number, string> = {}
    payload.a.forEach((option, linkIndex) => {
      const index = currentIndex(payload.v, linkIndex)
      if (index === null) return
      const text = getQuestionStep(index).question.options[option]
      if (typeof option === 'number' && text !== undefined)
        answers[index] = text
    })
    return {
      name: payload.n.slice(0, 20),
      department: payload.d.slice(0, 40),
      priorities: payload.p.filter((id): id is CategoryId =>
        CATEGORY_IDS.includes(id),
      ),
      answers,
    }
  } catch {
    return null
  }
}
