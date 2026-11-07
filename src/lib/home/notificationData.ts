export type Notification = {
  id: string
  sender: string
  time: string
  message: string
  isNew: boolean
}

export type NotificationList = {
  today: readonly Notification[]
  previous: readonly Notification[]
}

export type NotificationSample = 'noToday' | 'withToday'

const started = (
  id: string,
  sender: string,
  time: string,
  message = `${sender}과의 매칭이 시작되었어요`,
  isNew = false,
): Notification => ({ id, sender, time, message, isNew })

// Sample copy from the Figma frames. `강우정님` and `김우정님` differ there too (OPEN_QUESTIONS DE-H3).
const SAMPLES: Record<NotificationSample, NotificationList> = {
  // Figma 805:3459
  noToday: {
    today: [],
    previous: [
      started(
        'jimin',
        '한지민님',
        '2일전',
        '한지민님과의 매칭이 시작되었어요',
        true,
      ),
      started('nayeon', '이나연님', '3일전'),
      started('gayeong', '김가영님', '3일전'),
      started(
        'woojeong',
        '강우정님',
        '5일전',
        '김우정님과의 매칭이 시작되었어요',
      ),
      started('jeongmin', '김정민님', '6일전'),
      started('jeonghyeon', '신정현님', '7일전'),
      started('wooyeong', '정우영님', '7일전'),
    ],
  },
  // Figma 805:3559
  withToday: {
    today: [
      started(
        'roommate',
        '룸메이트님',
        '오후2:23',
        '룸메이트님과의 매칭이 시작되었어요',
        true,
      ),
    ],
    previous: [
      started('jimin', '한지민님', '2일전'),
      started('nayeon', '이나연님', '3일전'),
      started('gayeong', '김가영님', '3일전'),
    ],
  },
}

/** Sample data only. There is no notification API yet. Replace this when it exists. */
export function getNotifications(
  sample: NotificationSample = 'noToday',
): NotificationList {
  return SAMPLES[sample]
}

export function hasNewNotification({ today, previous }: NotificationList) {
  return [...today, ...previous].some(({ isNew }) => isNew)
}
