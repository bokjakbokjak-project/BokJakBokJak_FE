export const CATEGORY_IDS = [
  'sleep-habit',
  'cleaning',
  'wake-alarm',
  'personal-hygiene',
  'smoking',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

/** Fixed chip rows from Figma 733:2893. Selection and rank never change them. */
export const CATEGORY_ROWS: readonly (readonly CategoryId[])[] = [
  ['sleep-habit', 'cleaning', 'wake-alarm'],
  ['personal-hygiene', 'smoking'],
]

/** Gap between chips in a row. The 338px top row in Figma is three chips and two gaps. */
export const CATEGORY_CHIP_GAP = 8
export const CATEGORY_ROW_WIDTH = 338

type CategoryLabel = {
  emoji: string
  label: string
  activeLabel: string
  /** Chip width in Figma. Fixed because emoji widths differ between platforms. */
  width: number
  activeWidth: number
}

// Values follow the Figma `index` component (614:1315). Its smoking variant uses a
// different label when active; the final names are still open (OPEN_QUESTIONS PL-4).
export const CATEGORY_LABELS: Record<CategoryId, CategoryLabel> = {
  'sleep-habit': {
    emoji: '😴',
    label: '잠버릇',
    activeLabel: '잠버릇',
    width: 94,
    activeWidth: 94,
  },
  cleaning: {
    emoji: '🧹',
    label: '청소, 청결',
    activeLabel: '청소, 청결',
    width: 116,
    activeWidth: 116,
  },
  'wake-alarm': {
    emoji: '⏰',
    label: '기상 알람',
    activeLabel: '기상 알람',
    width: 112,
    activeWidth: 112,
  },
  'personal-hygiene': {
    emoji: '🧼',
    label: '개인 청결',
    activeLabel: '개인 청결',
    width: 112,
    activeWidth: 112,
  },
  smoking: {
    emoji: '🚬',
    label: '흡연유무',
    activeLabel: '흡연, 냄새',
    width: 108,
    activeWidth: 116,
  },
}
