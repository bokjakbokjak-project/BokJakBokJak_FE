/**
 * Dates as Korean users read them. Server times are ISO strings (UTC with `Z` in the spec
 * examples), so days are counted in Asia/Seoul whatever the device's own time zone is.
 */
const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** `2026-11-13` in Seoul, or null for a time that cannot be read. */
export function seoulDayKey(value: string | Date): string | null {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return null
  return DAY_KEY.format(date)
}

export function isSeoulToday(value: string, now = new Date()) {
  const key = seoulDayKey(value)
  return key !== null && key === seoulDayKey(now)
}

/**
 * `오늘`, `어제`, or `11월 9일`, like the sample rows of the chat list (Figma 1377:57476).
 * An unreadable time shows nothing.
 */
export function seoulDayLabel(value: string, now = new Date()) {
  const key = seoulDayKey(value)
  if (key === null) return ''
  const today = seoulDayKey(now)
  const yesterday = seoulDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))
  if (key === today) return '오늘'
  if (key === yesterday) return '어제'
  const [, month, day] = key.split('-').map(Number)
  return `${month}월 ${day}일`
}

const TIME = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * The notification time: `오후 2:23` for today and `2일전` before, like the Figma samples
 * (805:3459, 805:3559).
 */
export function seoulNotificationTime(value: string, now = new Date()) {
  const key = seoulDayKey(value)
  const today = seoulDayKey(now)
  if (key === null || today === null) return ''
  if (key === today) return TIME.format(new Date(value))
  const days = Math.round(
    (Date.parse(today) - Date.parse(key)) / (24 * 60 * 60 * 1000),
  )
  return days > 0 ? `${days}일전` : ''
}
