import { screen } from '@testing-library/react'

/** Row labels of the detail profile sections, in Figma order (2339:27404). */
export const ANSWER_ROW_LABELS = [
  '잠버릇',
  '기상알람',
  '청소',
  '개인물건',
  '온도',
  '흡연',
]

/** `전 이런 사람이에요`: the person's own answers. */
export const mineSection = () =>
  screen.getByRole('region', { name: '전 이런 사람이에요' })

/** `이런 분을 원해요`: the roommate the person wants. */
export const wantedSection = () =>
  screen.getByRole('region', { name: '이런 분을 원해요' })

export function answerRow(section: HTMLElement, label: string) {
  const row = section.querySelector<HTMLElement>(`[data-row="${label}"]`)
  if (!row) throw new Error(`No answer row ${label}`)
  return row
}

export function answerRowLabels(section: HTMLElement) {
  return [...section.querySelectorAll('[data-row]')].map((row) =>
    row.getAttribute('data-row'),
  )
}
