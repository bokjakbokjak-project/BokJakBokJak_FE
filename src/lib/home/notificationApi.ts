import { apiRequest } from '../api/apiClient'
import {
  asObject,
  readArray,
  readBoolean,
  readEnum,
  readNullableNumber,
  readNumber,
  readString,
} from '../api/parse'

/** The notification APIs (채희 spec 7.14 to 7.16). Kept for 30 days by the server. */

export const NOTIFICATION_TYPES = [
  'CHAT_REQUESTED',
  'PARTNER_CONFIRMED',
] as const
export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export type ServerNotification = {
  notificationId: number
  type: NotificationType
  content: string
  /** The room the notification opens. */
  matchingId: number | null
  isRead: boolean
  createdAt: string
}

export const NOTIFICATION_PAGE_SIZE = 20

/** One page, latest first. `hasNext` shows `더보기`. */
export async function getNotificationPage(
  page: number,
  signal?: AbortSignal,
): Promise<{ notifications: ServerNotification[]; hasNext: boolean }> {
  const query = new URLSearchParams({
    page: String(page),
    size: String(NOTIFICATION_PAGE_SIZE),
  })
  const data = asObject(
    await apiRequest(`/api/notifications?${query}`, { signal }),
  )
  return {
    notifications: readArray(data, 'notifications').map((value) => {
      const item = asObject(value, 'notifications')
      return {
        notificationId: readNumber(item, 'notification_id'),
        type: readEnum(item, 'type', NOTIFICATION_TYPES),
        content: readString(item, 'content'),
        matchingId: readNullableNumber(item, 'matching_id'),
        isRead: readBoolean(item, 'is_read'),
        createdAt: readString(item, 'created_at'),
      }
    }),
    hasNext: readBoolean(data, 'has_next'),
  }
}

/** Reading one twice is not an error (spec 7.15). */
export async function markNotificationRead(notificationId: number) {
  await apiRequest(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })
}

export async function getUnreadNotificationCount(
  signal?: AbortSignal,
): Promise<number> {
  return readNumber(
    asObject(await apiRequest('/api/notifications/unread-count', { signal })),
    'count',
  )
}
