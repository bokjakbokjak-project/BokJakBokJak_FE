/**
 * How the detail profile says each survey answer (requested 2026-11-19): the chosen option in a
 * friendly spoken ending (`~해요`, `~했어요`), instead of the survey's plain `~다` form. Only the
 * ending changes, except where the option is not a sentence on its own (a bedtime gets `자요`, a
 * cleaning frequency `청소`, and the 온도 habit `냉난방을`, as the Figma rows 2339:27404 show). The
 * survey screens and the saved answers keep the survey options; an answer not listed here (such as a
 * server label the screens do not know) is shown as it is.
 */
const FRIENDLY_ANSWERS: Readonly<
  Record<
    string,
    { self: Record<string, string>; roommate: Record<string, string> }
  >
> = {
  'sleep-habit': {
    self: {
      '자주 있다는 말을 들었다': '자주 있다는 말을 들었어요',
      '가끔 있다는 말을 들었다': '가끔 있다는 말을 들었어요',
      '예전에 한두 번 들은 적 있다': '예전에 한두 번 들은 적 있어요',
      '없다는 말을 들었다': '없다는 말을 들었어요',
      '잘 모르겠다': '잘 모르겠어요',
    },
    roommate: {
      '자주 있어도 괜찮다': '자주 있어도 괜찮아요',
      '가끔 있는 정도는 괜찮다': '가끔 있는 정도는 괜찮아요',
      '거의 없는 편이면 괜찮다': '거의 없는 편이면 괜찮아요',
      '없었으면 좋겠다': '없었으면 좋겠어요',
    },
  },
  bedtime: {
    self: {
      '밤 10시 이전': '밤 10시 이전에 자요',
      '밤 10시~12시': '밤 10시~12시에 자요',
      '새벽 12시~2시': '새벽 12시~2시에 자요',
      '새벽 2시 이후': '새벽 2시 이후에 자요',
      '일정하지 않다': '자는 시간이 일정하지 않아요',
    },
    // The question asks until when the roommate may stay awake in the room.
    roommate: {
      '밤 11시까지': '밤 11시까지 괜찮아요',
      '밤 12시까지': '밤 12시까지 괜찮아요',
      '새벽 1시까지': '새벽 1시까지 괜찮아요',
      '새벽 2시까지': '새벽 2시까지 괜찮아요',
      '큰 소음이 아니라면 상관없다': '큰 소음이 아니라면 상관없어요',
      // The Figma sample candidate's wording (roommateData FIGMA_SAMPLE_ANSWERS, DE-R1).
      '조용하기만 하면 상관없다': '조용하기만 하면 상관없어요',
    },
  },
  'morning-alarm': {
    self: {
      '첫 알람에 바로 일어난다': '첫 알람에 바로 일어나요',
      '2번 이내로 끄고 일어난다': '2번 이내로 끄고 일어나요',
      '3~4번 정도 반복한다': '3~4번 정도 반복해요',
      '5번 이상 반복하는 편이다': '5번 이상 반복하는 편이에요',
      '알람을 거의 사용하지 않는다': '알람을 거의 사용하지 않아요',
    },
    roommate: {
      '여러 번 울려도 괜찮다': '여러 번 울려도 괜찮아요',
      '3~4번까지는 괜찮다': '3~4번까지는 괜찮아요',
      '3~4번 까지는 괜찮다': '3~4번까지는 괜찮아요',
      '2번 정도까지만 괜찮다': '2번 정도까지만 괜찮아요',
      '한 번만 울렸으면 좋겠다': '한 번만 울렸으면 좋겠어요',
    },
  },
  'floor-cleaning': {
    self: {
      '거의 매일 한다': '거의 매일 청소해요',
      '주 2~3회 한다': '주 2~3회 청소해요',
      '주 1회 한다': '주 1회 청소해요',
      '2주에 1회 정도 한다': '2주에 1회 정도 청소해요',
      '더 드물게 한다': '더 드물게 청소해요',
      '거의 매일 해야한다': '거의 매일 청소해요',
    },
    // The roommate's minimum, with the server's `해야 한다` labels (FLOOR_CLEAN_T).
    roommate: {
      '거의 매일 해야 한다': '거의 매일 청소했으면 좋겠어요',
      '주 2~3회는 해야 한다': '주 2~3회는 청소했으면 좋겠어요',
      '주 1회면 괜찮다': '주 1회면 괜찮아요',
      '2주 1회면 괜찮다': '2주 1회면 괜찮아요',
      '필요할 때만 해도 괜찮다': '필요할 때만 해도 괜찮아요',
    },
  },
  'food-waste': {
    self: {
      '먹은 직후 바로 치운다': '먹은 직후 바로 치워요',
      '그날 안에 치운다': '그날 안에 치워요',
      '다음 날 치우기도 한다': '다음 날 치우기도 해요',
      '이틀 이상 두는 경우도 있다': '이틀 이상 두는 경우도 있어요',
      '방에서 음식을 먹지 않는다': '방에서 음식을 먹지 않아요',
    },
    roommate: {
      '먹은 직후 바로 치워줬으면 좋겠다': '먹은 직후 바로 치워줬으면 좋겠어요',
      '그날 안에만 치우면 괜찮다': '그날 안에만 치우면 괜찮아요',
      '다음 날까지는 괜찮다': '다음 날까지는 괜찮아요',
      '냄새나 위생 문제가 없다면 더 두어도 괜찮다':
        '냄새나 위생 문제가 없다면 더 두어도 괜찮아요',
    },
  },
  belongings: {
    self: {
      '바로 정리한다': '바로 정리해요',
      '그날 안에 정리한다': '그날 안에 정리해요',
      '며칠 모아두었다가 정리한다': '며칠 모아두었다가 정리해요',
      '크게 신경 쓰지 않고 필요할 때 정리한다':
        '크게 신경 쓰지 않고 필요할 때 정리해요',
    },
    roommate: {
      '바로 정리했으면 좋겠다': '바로 정리했으면 좋겠어요',
      '그날 안에는 정리했으면 좋겠다': '그날 안에는 정리했으면 좋겠어요',
      '며칠 정도는 괜찮다': '며칠 정도는 괜찮아요',
      '내 공간만 침범하지 않으면 괜찮다': '내 공간만 침범하지 않으면 괜찮아요',
    },
  },
  temperature: {
    self: {
      '방에 있는 동안 계속 켜두는 편이다':
        '방에 있는 동안 냉난방을 계속 켜두는 편이에요',
      '덥거나 추울 때 일정시간 이상 켜둔다':
        '덥거나 추울 때 냉난방을 일정시간 이상 켜둬요',
      '덥거나 추울 때 잠깐 켰다가 끈다':
        '덥거나 추울 때 냉난방을 잠깐 켰다가 꺼요',
      '거의 사용하지 않는다': '냉난방을 거의 사용하지 않아요',
    },
    roommate: {
      '방에 있는 동안 계속 켜두어도 괜찮다':
        '방에 있는 동안 계속 켜두어도 괜찮아요',
      '덥거나 추울 때 일정시간 이상 켜두어도 괜찮다':
        '덥거나 추울 때 일정시간 이상 켜두어도 괜찮아요',
      '덥거나 추울 때 잠깐 켰다가 꺼줬으면 한다':
        '덥거나 추울 때 잠깐 켰다가 꺼줬으면 해요',
      '거의 사용하지 않았으면 좋겠다': '거의 사용하지 않았으면 좋겠어요',
    },
  },
  smoking: {
    self: {
      비흡연자다: '비흡연자예요',
      '흡연자이지만 기숙사에서는 자제할 예정이다':
        '흡연자이지만 기숙사에서는 자제할 예정이에요',
      '흡연하며 지정된 실외 장소를 이용할 예정이다':
        '흡연하며 지정된 실외 장소를 이용할 예정이에요',
    },
    roommate: {
      '흡연 여부는 상관없다': '흡연 여부는 상관없어요',
      '실외에서만 하고 냄새가 거의 없으면 괜찮다':
        '실외에서만 하고 냄새가 거의 없으면 괜찮아요',
      '가능한 비흡연자였으면 좋겠다': '가능한 비흡연자였으면 좋겠어요',
      '흡연자와는 같은 방이 어렵다': '흡연자와는 같은 방이 어려워요',
    },
  },
}

/** The detail profile wording of an answer to topic `topicId`'s self or roommate question. */
export function friendlyAnswer(
  topicId: string,
  side: 'self' | 'roommate',
  answer: string,
) {
  // Own keys only: an answer such as `constructor` must not reach the object's inherited members.
  const table = Object.hasOwn(FRIENDLY_ANSWERS, topicId)
    ? FRIENDLY_ANSWERS[topicId][side]
    : undefined
  return table && Object.hasOwn(table, answer) ? table[answer] : answer
}
