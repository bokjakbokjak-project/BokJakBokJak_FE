import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/apiError'
import { clearTokens, startSession } from '../auth/tokenStore'
import {
  findRoomType,
  getDormitoryApi,
  pickRegisteredRoomType,
  type DormitoryApi,
  type DormitoryOption,
} from './dormitoryApi'
import { mockDormitoryApi } from './dormitoryApi.mock'
import {
  OnboardingInputError,
  buildOnboardingRequest,
  describeSubmitError,
  getConfirmedRoomType,
  parseOnboardingResponse,
  resolveRoomType,
  saveOnboarding,
} from './onboardingApi'
import { INITIAL_ONBOARDING_DATA, type OnboardingData } from './onboardingState'

const BASE = 'https://api.example.test'

const ANSWERS: OnboardingData = {
  ...INITIAL_ONBOARDING_DATA,
  department: ' 소프트웨어학과 ',
  studentId: '2024123456',
  name: ' 민수정 ',
  gender: 'female',
  birthYear: 2005,
  dormitory: '새봄학사',
  roomCapacity: 2,
  priorities: ['sleep-habit', 'wake-alarm', 'cleaning'],
}

const SAEBOM: DormitoryOption = {
  key: '새봄학사',
  name: '새봄학사',
  roomTypes: [{ id: 101, name: '2인실', capacity: 2 }],
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
const ok = (data: unknown) =>
  json(200, { success: true, code: 'OK', message: '성공', data })

let fetchMock: ReturnType<typeof vi.fn>
const requestAt = (index: number) => {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit]
  return {
    path: url.slice(BASE.length),
    method: init.method,
    body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
    auth: new Headers(init.headers).get('Authorization'),
  }
}

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.reject(new Error('unexpected request')))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_API_MODE', 'server')
  vi.stubEnv('VITE_API_BASE_URL', BASE)
  startSession({ accessToken: 'access-1', refreshToken: 'refresh-1' })
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  clearTokens()
})

describe('onboarding request', () => {
  it('maps every answer to the spec field and ranks priorities in order', () => {
    expect(buildOnboardingRequest(ANSWERS, 101)).toEqual({
      department: '소프트웨어학과',
      student_number: '2024123456',
      nickname: '민수정',
      gender: 'FEMALE',
      birth_year: 2005,
      room_type_id: 101,
      priorities: [
        { category_code: 'SLEEP_HABITS', rank: 1 },
        { category_code: 'SLEEP_SCHEDULE', rank: 2 },
        { category_code: 'CLEANING', rank: 3 },
      ],
    })
  })

  it('sends nothing the spec does not ask for', () => {
    const body = buildOnboardingRequest(ANSWERS, 101)
    expect(Object.keys(body).sort()).toEqual([
      'birth_year',
      'department',
      'gender',
      'nickname',
      'priorities',
      'room_type_id',
      'student_number',
    ])
  })

  it('maps all five categories and the male option', () => {
    const body = buildOnboardingRequest(
      {
        ...ANSWERS,
        gender: 'male',
        priorities: [
          'smoking',
          'personal-hygiene',
          'cleaning',
          'wake-alarm',
          'sleep-habit',
        ],
      },
      7,
    )
    expect(body.gender).toBe('MALE')
    expect(body.priorities).toEqual([
      { category_code: 'SMOKING', rank: 1 },
      { category_code: 'PERSONAL_HYGIENE', rank: 2 },
      { category_code: 'CLEANING', rank: 3 },
      { category_code: 'SLEEP_SCHEDULE', rank: 4 },
      { category_code: 'SLEEP_HABITS', rank: 5 },
    ])
  })

  it.each([
    ['two priorities', { priorities: ['sleep-habit', 'cleaning'] }],
    [
      'a repeated priority',
      { priorities: ['sleep-habit', 'cleaning', 'cleaning'] },
    ],
    ['no gender', { gender: null }],
    ['no birth year', { birthYear: null }],
    ['a blank student number', { studentId: '  ' }],
  ] as const)('refuses %s before any request', (_name, patch) => {
    expect(() =>
      buildOnboardingRequest({ ...ANSWERS, ...patch } as OnboardingData, 1),
    ).toThrow(OnboardingInputError)
  })
})

describe('onboarding response', () => {
  it('reads the snake_case answer', () => {
    expect(
      parseOnboardingResponse({
        onboarding_completed: true,
        survey_completed: false,
        next_step: 'SURVEY',
      }),
    ).toEqual({
      onboardingCompleted: true,
      surveyCompleted: false,
      nextStep: 'SURVEY',
    })
  })

  it('refuses an answer in another shape', () => {
    expect(() =>
      parseOnboardingResponse({
        onboardingCompleted: true,
        surveyCompleted: false,
        nextStep: 'SURVEY',
      }),
    ).toThrow(ApiError)
  })

  it('PUTs the body with the access token', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        onboarding_completed: true,
        survey_completed: false,
        next_step: 'SURVEY',
      }),
    )
    const body = buildOnboardingRequest(ANSWERS, 101)

    await saveOnboarding(body)

    expect(requestAt(0)).toEqual({
      path: '/api/me/onboarding',
      method: 'PUT',
      body,
      auth: 'Bearer access-1',
    })
  })

  it('does not count a 200 that says the onboarding is not complete', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        onboarding_completed: false,
        survey_completed: false,
        next_step: 'ONBOARDING',
      }),
    )
    await expect(
      saveOnboarding(buildOnboardingRequest(ANSWERS, 101)),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
})

describe('dormitory API', () => {
  it('searches with the keyword and reads the nested room type IDs', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        dormitories: [
          {
            dormitory_key: '새봄학사',
            name: '새봄학사',
            room_types: [{ room_type_id: 101, name: '2인실', capacity: 2 }],
          },
        ],
      }),
    )

    await expect(getDormitoryApi().search('새봄 학사')).resolves.toEqual([
      SAEBOM,
    ])
    expect(requestAt(0)).toMatchObject({
      path: `/api/dormitories?keyword=${encodeURIComponent('새봄 학사').replace(/%20/g, '+')}`,
      method: 'GET',
      auth: 'Bearer access-1',
    })
  })

  it('registers with the spec body and reads the returned IDs', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        dormitory_key: '새봄학사',
        name: '새봄학사',
        room_types: [{ room_type_id: 101, name: '2인실', capacity: 2 }],
      }),
    )

    await expect(
      getDormitoryApi().register({
        name: '새봄학사',
        roomTypeName: '2인실',
        capacity: 2,
      }),
    ).resolves.toEqual(SAEBOM)
    expect(requestAt(0)).toMatchObject({
      path: '/api/dormitories',
      method: 'POST',
      body: { name: '새봄학사', room_type_name: '2인실', capacity: 2 },
    })
  })

  it('refuses a room type without a usable ID', async () => {
    fetchMock.mockResolvedValueOnce(
      ok({
        dormitories: [
          {
            dormitory_key: 'k',
            name: '새봄학사',
            room_types: [{ room_type_id: '101', name: '2인실', capacity: 2 }],
          },
        ],
      }),
    )
    await expect(getDormitoryApi().search('새봄')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    })
  })

  it('uses the sample data outside server mode', () => {
    vi.stubEnv('VITE_API_MODE', 'mock')
    expect(getDormitoryApi()).toBe(mockDormitoryApi)
  })
})

describe('room type matching', () => {
  const twoDorms: DormitoryOption[] = [
    SAEBOM,
    {
      key: '새봄학사별관',
      name: '새봄학사 별관',
      roomTypes: [{ id: 102, name: '2인실', capacity: 2 }],
    },
  ]

  it('takes the ID only for the exact name, ignoring leading and trailing spaces', () => {
    expect(findRoomType(twoDorms, ' 새봄학사 ', '2인실', 2)?.id).toBe(101)
    expect(findRoomType(twoDorms, '새봄학사 별관', '2인실', 2)?.id).toBe(102)
  })

  it('leaves names the server may normalize differently to POST', () => {
    // Inner spaces or case are the server's call: no ID is reused for them here.
    expect(findRoomType(twoDorms, '새봄 학사', '2인실', 2)).toBeNull()
    expect(findRoomType(twoDorms, '새봄학사', '2 인실', 2)).toBeNull()
  })

  it('finds nothing for a partial name, another room type or capacity', () => {
    expect(findRoomType(twoDorms, '새봄', '2인실', 2)).toBeNull()
    expect(findRoomType(twoDorms, '새봄학사', '4인실', 2)).toBeNull()
    expect(findRoomType(twoDorms, '새봄학사', '2인실', 4)).toBeNull()
  })

  it('picks 2인실 with capacity 2 among several returned room types', () => {
    const dormitory: DormitoryOption = {
      ...SAEBOM,
      roomTypes: [
        { id: 201, name: 'A동', capacity: 2 },
        { id: 202, name: '2인실', capacity: 4 },
        { id: 203, name: '2인실', capacity: 2 },
        { id: 204, name: '4인실', capacity: 4 },
      ],
    }
    expect(pickRegisteredRoomType(dormitory, '2인실', 2).id).toBe(203)
  })

  it('refuses a POST answer without exactly one 2인실 of capacity 2', () => {
    const only = (roomTypes: DormitoryOption['roomTypes']) => ({
      ...SAEBOM,
      roomTypes,
    })
    // A lone entry with another name is not taken any more.
    expect(() =>
      pickRegisteredRoomType(
        only([{ id: 1, name: 'A동', capacity: 2 }]),
        '2인실',
        2,
      ),
    ).toThrow(ApiError)
    expect(() =>
      pickRegisteredRoomType(
        only([{ id: 1, name: '2인실', capacity: 4 }]),
        '2인실',
        2,
      ),
    ).toThrow(ApiError)
    expect(() =>
      pickRegisteredRoomType(
        only([
          { id: 1, name: '2인실', capacity: 2 },
          { id: 2, name: '2인실', capacity: 2 },
        ]),
        '2인실',
        2,
      ),
    ).toThrow(ApiError)
    expect(() => pickRegisteredRoomType(only([]), '2인실', 2)).toThrow(ApiError)
  })

  it('uses a picked dormitory only while its name matches and it has a 2인실', () => {
    const picked = { ...ANSWERS, selectedDormitory: SAEBOM }
    expect(getConfirmedRoomType(picked)?.id).toBe(101)
    expect(
      getConfirmedRoomType({ ...picked, dormitory: '다른 기숙사' }),
    ).toBeNull()
    expect(
      getConfirmedRoomType({
        ...picked,
        selectedDormitory: {
          ...SAEBOM,
          roomTypes: [{ id: 109, name: 'A동', capacity: 2 }],
        },
      }),
    ).toBeNull()
    expect(getConfirmedRoomType(ANSWERS)).toBeNull()
  })
})

describe('resolveRoomType', () => {
  const api = (overrides: Partial<DormitoryApi>): DormitoryApi => ({
    search: vi.fn(async () => []),
    register: vi.fn(async () => SAEBOM),
    ...overrides,
  })

  it('reuses an existing room type without registering', async () => {
    const dormitories = api({ search: vi.fn(async () => [SAEBOM]) })

    const resolved = await resolveRoomType(ANSWERS, dormitories)

    expect(resolved.roomType.id).toBe(101)
    expect(dormitories.search).toHaveBeenCalledWith('새봄학사')
    expect(dormitories.register).not.toHaveBeenCalled()
  })

  it('registers 2인실 for an existing dormitory that has none yet', async () => {
    const withoutTwo: DormitoryOption = {
      ...SAEBOM,
      roomTypes: [{ id: 108, name: 'A동', capacity: 2 }],
    }
    const withTwo: DormitoryOption = {
      ...SAEBOM,
      roomTypes: [
        ...withoutTwo.roomTypes,
        { id: 104, name: '2인실', capacity: 2 },
      ],
    }
    const dormitories = api({
      search: vi.fn(async () => [withoutTwo]),
      register: vi.fn(async () => withTwo),
    })

    const resolved = await resolveRoomType(ANSWERS, dormitories)

    expect(dormitories.register).toHaveBeenCalledWith({
      name: '새봄학사',
      roomTypeName: '2인실',
      capacity: 2,
    })
    expect(resolved.roomType.id).toBe(104)
  })

  it('registers a new dormitory with 2인실 and capacity 2', async () => {
    const dormitories = api({})
    const resolved = await resolveRoomType(ANSWERS, dormitories)
    expect(dormitories.register).toHaveBeenCalledTimes(1)
    expect(dormitories.register).toHaveBeenCalledWith({
      name: '새봄학사',
      roomTypeName: '2인실',
      capacity: 2,
    })
    expect(resolved).toEqual({
      dormitory: SAEBOM,
      roomType: SAEBOM.roomTypes[0],
    })
  })

  it('lets the server decide whether a name with other spacing is the same dormitory', async () => {
    const dormitories = api({ search: vi.fn(async () => [SAEBOM]) })

    const resolved = await resolveRoomType(
      { ...ANSWERS, dormitory: '새봄 학사' },
      dormitories,
    )

    expect(dormitories.register).toHaveBeenCalledWith({
      name: '새봄 학사',
      roomTypeName: '2인실',
      capacity: 2,
    })
    // The server answered with its existing tag, and that ID is used.
    expect(resolved.roomType.id).toBe(101)
  })

  it('stops before registering when the checkpoint refuses', async () => {
    const dormitories = api({})
    const stop = new Error('session changed')

    await expect(
      resolveRoomType(ANSWERS, dormitories, () => {
        throw stop
      }),
    ).rejects.toBe(stop)
    expect(dormitories.search).toHaveBeenCalledTimes(1)
    expect(dormitories.register).not.toHaveBeenCalled()
  })

  it('stops before any request for an unsupported capacity or a long name', async () => {
    const dormitories = api({})
    await expect(
      resolveRoomType({ ...ANSWERS, roomCapacity: 4 }, dormitories),
    ).rejects.toThrow(OnboardingInputError)
    await expect(
      resolveRoomType({ ...ANSWERS, dormitory: '가'.repeat(81) }, dormitories),
    ).rejects.toThrow(OnboardingInputError)
    expect(dormitories.search).not.toHaveBeenCalled()
  })
})

describe('submit messages', () => {
  const httpError = (
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string> = {},
  ) => new ApiError({ kind: 'http', status, code, message, fieldErrors })

  it('names the answer that a field error is about', () => {
    expect(
      describeSubmitError(
        httpError(400, 'INVALID_INPUT', '요청 값이 올바르지 않습니다.', {
          student_number: '숫자 4~10자리로 입력해주세요.',
        }),
      ),
    ).toBe('학번: 숫자 4~10자리로 입력해주세요.')
  })

  it('shows the server message after the first survey (409)', () => {
    expect(
      describeSubmitError(
        httpError(
          409,
          'ONBOARDING_ALREADY_SUBMITTED',
          '순위 변경은 설문 수정에서 진행해주세요.',
        ),
      ),
    ).toBe('순위 변경은 설문 수정에서 진행해주세요.')
  })

  it('falls back to a general message for an unknown failure', () => {
    expect(describeSubmitError(new Error('boom'))).toBe(
      '저장하지 못했어요. 다시 시도해주세요.',
    )
  })
})
