export const CATEGORY_IDS = [
  'sleep-habit',
  'wake-alarm',
  'cleaning',
  'personal-hygiene',
  'smoking',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

/** Fixed card rows from Figma 1036:26158. Selection and rank never change them. */
export const CATEGORY_ROWS: readonly (readonly CategoryId[])[] = [
  ['sleep-habit', 'wake-alarm', 'cleaning'],
  ['personal-hygiene', 'smoking'],
]

type CategoryLabel = {
  label: string
  /** Left offset of the shared icon image in the Figma crop, as a percentage. */
  iconLeft: number
}

// Values follow the Figma `우선순위` component (1041:30261). The final names are still open
// (OPEN_QUESTIONS PL-4).
export const CATEGORY_LABELS: Record<CategoryId, CategoryLabel> = {
  'sleep-habit': { label: '잠버릇', iconLeft: -3.99 },
  'wake-alarm': { label: '기상알람', iconLeft: -93.89 },
  cleaning: { label: '청소,청결', iconLeft: -186.85 },
  'personal-hygiene': { label: '개인청결', iconLeft: -281.56 },
  smoking: { label: '흡연유무', iconLeft: -377.57 },
}

/** Card styles from the Figma `우선순위` component (1041:30261). */
export function categoryCardClass(isSelected: boolean) {
  const state = isSelected
    ? 'border-brand-brown3 shadow-[inset_-6px_-6px_0_0_rgba(252,208,169,0.25)]'
    : 'border-brand-cream4'
  return `relative block h-[82px] w-full rounded-[6px] border-[1.5px] bg-white ${state}`
}
