import categoryTemperature from '../../assets/onboarding/category-temperature.png'

export const CATEGORY_IDS = [
  'sleep-habit',
  'wake-alarm',
  'cleaning',
  'personal-hygiene',
  'smoking',
  'temperature',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

/**
 * Server `category_code` of each card, matched by name and display order to the categories of
 * GET /api/surveys/current in the Notion spec (잠버릇, 기상 알람, 청소 청결, 개인 청결, 흡연 유무).
 * `TEMPERATURE` (온도, 6th) comes from the backend migration V11 (BE PR #73, 2026-11-20). A
 * server that does not have it yet stops the save instead of sending a code it would refuse.
 */
export const CATEGORY_SERVER_CODES: Record<CategoryId, string> = {
  'sleep-habit': 'SLEEP_HABITS',
  'wake-alarm': 'SLEEP_SCHEDULE',
  cleaning: 'CLEANING',
  'personal-hygiene': 'PERSONAL_HYGIENE',
  smoking: 'SMOKING',
  temperature: 'TEMPERATURE',
}

/**
 * Fixed card rows from Figma 1036:26158, with 온도 last (2026-11-19). Selection and rank never
 * change them.
 */
export const CATEGORY_ROWS: readonly (readonly CategoryId[])[] = [
  ['sleep-habit', 'wake-alarm', 'cleaning'],
  ['personal-hygiene', 'smoking', 'temperature'],
]

type CategoryLabel = {
  label: string
  /**
   * `sprite`: left offset of the shared icon image in the Figma crop, as a percentage.
   * `image`: an icon of its own, placed as in its Figma card (온도, 2441:22417).
   */
  icon: { kind: 'sprite'; left: number } | { kind: 'image'; src: string }
}

// Values follow the Figma `우선순위` component (1041:30261). The final names are still open
// (OPEN_QUESTIONS PL-4).
export const CATEGORY_LABELS: Record<CategoryId, CategoryLabel> = {
  'sleep-habit': { label: '잠버릇', icon: { kind: 'sprite', left: -3.99 } },
  'wake-alarm': { label: '기상알람', icon: { kind: 'sprite', left: -93.89 } },
  cleaning: { label: '청소,청결', icon: { kind: 'sprite', left: -186.85 } },
  'personal-hygiene': {
    label: '개인청결',
    icon: { kind: 'sprite', left: -281.56 },
  },
  smoking: { label: '흡연유무', icon: { kind: 'sprite', left: -377.57 } },
  temperature: {
    label: '온도',
    icon: { kind: 'image', src: categoryTemperature },
  },
}

/** Card styles from the Figma `우선순위` component (1041:30261). */
export function categoryCardClass(isSelected: boolean) {
  const state = isSelected
    ? 'border-brand-brown3 shadow-[inset_-6px_-6px_0_0_rgba(252,208,169,0.25)]'
    : 'border-brand-cream4'
  return `relative block h-[82px] w-full rounded-[6px] border-[1.5px] bg-white ${state}`
}
