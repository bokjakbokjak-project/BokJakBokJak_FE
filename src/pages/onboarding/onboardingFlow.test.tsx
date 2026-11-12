import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { Link, MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { MISSION_NOTICE_MS } from '../../components/onboarding/MissionNotice'
import { ROOM_NOTICE_MS } from './DormitoryPage'
import {
  INITIAL_ONBOARDING_DATA,
  getRequiredStepRoute,
  type OnboardingData,
} from '../../lib/onboarding/onboardingState'
import { ONBOARDING_ROUTES } from '../../lib/onboarding/routes'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

// Keeps the in-memory answers while changing the URL, like browser history does.
function renderWithUrlEntry(path: string, target: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <Link to={target}>URL 이동</Link>
    </MemoryRouter>,
  )
}

const enterUrl = () =>
  fireEvent.click(screen.getByRole('link', { name: 'URL 이동' }))

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }))

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

function layerVariant(part: string) {
  return document
    .querySelector(`[data-layer="${part}"]`)
    ?.getAttribute('data-variant')
}

function completeSchoolStep() {
  type('학과', '소프트웨어학부')
  type('학번', '20261234')
  click('다음으로')
}

function completeProfileStep() {
  type('닉네임', '복작이')
  click('여성')
  click('출생년도를 선택해주세요')
  click('선택하기')
  click('다음으로')
}

function completeDormitoryStep() {
  type('기숙사', '남산학사')
  type('방 타입', 'A동')
  click('2인실')
  click('다음으로')
}

function renderProfileStep() {
  renderAt(ONBOARDING_ROUTES.school)
  completeSchoolStep()
}

function renderPriorityStep() {
  renderProfileStep()
  completeProfileStep()
  completeDormitoryStep()
}

const expectHeading = (name: string | RegExp) =>
  expect(screen.getByRole('heading', { name })).toBeInTheDocument()

function chipRows() {
  return screen.getAllByTestId('priority-row').map((row) =>
    within(row)
      .getAllByRole('button')
      .map((chip) => chip.textContent),
  )
}

function expectFixedChipRows() {
  expect(chipRows()).toEqual([
    ['잠버릇', '기상알람', '청소,청결'],
    ['개인청결', '흡연유무'],
  ])
}

const chip = (name: RegExp) => screen.getByRole('button', { name })

describe('login shortcut', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('moves to the school step without storing auth state', () => {
    renderAt(ONBOARDING_ROUTES.login)

    click('Sign up with Google')

    expect(
      screen.getByRole('heading', { name: '학교 정보를 등록해주세요' }),
    ).toBeInTheDocument()
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
    expect(document.cookie).toBe('')
  })

  it('moves to the school step in a production build', () => {
    vi.stubEnv('DEV', false)
    renderAt(ONBOARDING_ROUTES.login)

    click('Sign up with Google')

    expectHeading('학교 정보를 등록해주세요')
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
    expect(document.cookie).toBe('')
  })

  it('keeps the step checks after the button in a production build', () => {
    vi.stubEnv('DEV', false)
    renderAt(ONBOARDING_ROUTES.login)
    click('Sign up with Google')

    click('다음으로')

    expectHeading('학교 정보를 등록해주세요')
  })
})

describe('demo mode', () => {
  const NOTICE = /테스트 데이터를 입력해주세요/

  const stubBuild = (flag?: string, vercelEnv?: string) => {
    vi.stubEnv('DEV', false)
    if (flag !== undefined) vi.stubEnv('VITE_DEMO_MODE', flag)
    if (vercelEnv !== undefined) vi.stubEnv('VITE_VERCEL_ENV', vercelEnv)
  }

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('moves from Google to the school step and stores no auth state', () => {
    stubBuild('true', 'preview')
    renderAt(ONBOARDING_ROUTES.login)

    expect(screen.getByRole('note')).toHaveTextContent(NOTICE)
    click('Sign up with Google')

    expectHeading('학교 정보를 등록해주세요')
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
    expect(document.cookie).toBe('')
  })

  it.each([
    ['no variables', undefined, undefined],
    ['the flag only', 'true', undefined],
    ['the flag in Production', 'true', 'production'],
    ['Preview without the flag', undefined, 'preview'],
    ['the flag set to false', 'false', 'preview'],
    ['a flag value other than true', '1', 'preview'],
  ])('stays off with %s', (_, flag, vercelEnv) => {
    stubBuild(flag, vercelEnv)
    renderAt(ONBOARDING_ROUTES.login)

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('keeps the step checks', () => {
    stubBuild('true', 'preview')
    renderAt(ONBOARDING_ROUTES.complete)

    expectHeading('학교 정보를 등록해주세요')

    click('다음으로')
    expectHeading('학교 정보를 등록해주세요')
  })

  it('shows no notice on the development server', () => {
    renderAt(ONBOARDING_ROUTES.login)

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

describe('priority chip positions', () => {
  it('keeps a bottom-row chip in place when it is selected first', () => {
    renderPriorityStep()
    expectFixedChipRows()

    click(/흡연유무/)

    expectFixedChipRows()
    expect(within(chip(/흡연/)).getByAltText('1순위')).toBeInTheDocument()
    expect(layerVariant('head')).toBe('smoking')
  })

  it('keeps the third top-row chip in place when it is selected second', () => {
    renderPriorityStep()

    click(/개인청결/)
    click(/기상알람/)

    expectFixedChipRows()
    expect(within(chip(/개인청결/)).getByAltText('1순위')).toBeInTheDocument()
    expect(within(chip(/기상알람/)).getByAltText('2순위')).toBeInTheDocument()
    expect(layerVariant('head')).toBe('personal-hygiene')
    expect(layerVariant('hand')).toBe('wake-alarm')
  })

  it('keeps three chips on top and two below after three selections', () => {
    renderPriorityStep()

    click(/개인청결/)
    click(/기상알람/)
    click(/잠버릇/)

    expectFixedChipRows()
    expect(within(chip(/잠버릇/)).getByAltText('3순위')).toBeInTheDocument()
    expect(layerVariant('body')).toBe('sleep-habit')
    // QA 3: every category has to be ranked.
    expect(screen.getByRole('button', { name: '완료하기' })).toBeDisabled()
  })

  it('keeps positions and pulls ranks forward when a selection is cancelled', () => {
    renderPriorityStep()

    click(/개인청결/)
    click(/기상알람/)
    click(/잠버릇/)
    click(/개인청결/)

    expectFixedChipRows()
    expect(chip(/개인청결/)).toHaveAttribute('aria-pressed', 'false')
    expect(within(chip(/개인청결/)).queryByRole('img')).not.toBeInTheDocument()
    expect(within(chip(/기상알람/)).getByAltText('1순위')).toBeInTheDocument()
    expect(within(chip(/잠버릇/)).getByAltText('2순위')).toBeInTheDocument()
    expect(layerVariant('head')).toBe('wake-alarm')
    expect(layerVariant('hand')).toBe('sleep-habit')
    expect(layerVariant('body')).toBe('default')
    expect(screen.getByRole('button', { name: '완료하기' })).toBeDisabled()
  })
})

describe('onboarding flow', () => {
  it('stays on a step until its required fields are filled', () => {
    renderAt(ONBOARDING_ROUTES.school)

    click('다음으로')
    expect(
      screen.getByRole('heading', { name: '학교 정보를 등록해주세요' }),
    ).toBeInTheDocument()

    completeSchoolStep()
    expect(
      screen.getByRole('heading', { name: '내 정보를 등록해주세요' }),
    ).toBeInTheDocument()
  })

  it('keeps entered values when moving back and forward', () => {
    renderAt(ONBOARDING_ROUTES.school)

    completeSchoolStep()
    type('닉네임', '복작이')
    click('남성')
    click('이전')

    expect(screen.getByLabelText('학과')).toHaveValue('소프트웨어학부')
    expect(screen.getByLabelText('학번')).toHaveValue('20261234')

    click('다음으로')
    expect(screen.getByLabelText('닉네임')).toHaveValue('복작이')
    expect(screen.getByRole('button', { name: '남성' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('selects a birth year in the bottom sheet', () => {
    renderProfileStep()

    click('출생년도를 선택해주세요')
    const sheet = screen.getByRole('dialog', { name: '연도 선택' })
    expect(within(sheet).getByTestId('selected-year')).toHaveTextContent('2005')

    fireEvent.click(within(sheet).getByRole('button', { name: '2006' }))
    expect(within(sheet).getByTestId('selected-year')).toHaveTextContent('2006')

    fireEvent.click(within(sheet).getByRole('button', { name: '선택하기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2006' })).toBeInTheDocument()
  })

  it('updates ranks and the character on every selection', () => {
    renderPriorityStep()
    const finish = screen.getByRole('button', { name: '완료하기' })

    expect(finish).toBeDisabled()
    expect(layerVariant('head')).toBe('default')

    click(/잠버릇/)
    expect(layerVariant('head')).toBe('sleep-habit')
    expect(layerVariant('hand')).toBe('default')
    expect(screen.getByAltText('1순위')).toBeInTheDocument()

    click(/기상알람/)
    expect(layerVariant('hand')).toBe('wake-alarm')
    expect(layerVariant('body')).toBe('default')
    expect(finish).toBeDisabled()

    click(/청소,청결/)
    expect(layerVariant('body')).toBe('cleaning')
    expect(screen.getByAltText('3순위')).toBeInTheDocument()
    expect(finish).toBeDisabled()

    click(/개인청결/)
    expect(finish).toBeDisabled()
    click(/흡연유무/)
    expect(finish).toBeEnabled()
  })

  it('allows ranks 4 and 5 without changing the character', () => {
    renderPriorityStep()
    const finish = screen.getByRole('button', { name: '완료하기' })

    click(/잠버릇/)
    click(/기상알람/)
    click(/청소,청결/)
    const parts = () =>
      ['head', 'hand', 'body'].map((part) => layerVariant(part)).join()
    const threeRanks = parts()

    click(/개인청결/)
    expect(
      within(chip(/개인청결/)).getByRole('img', { name: '4순위' }),
    ).toBeInTheDocument()
    expect(parts()).toBe(threeRanks)
    expect(finish).toBeDisabled()

    click(/흡연유무/)
    expect(
      within(chip(/흡연유무/)).getByRole('img', { name: '5순위' }),
    ).toBeInTheDocument()
    expect(parts()).toBe(threeRanks)
    expect(finish).toBeEnabled()

    click(/잠버릇/)
    expect(
      within(chip(/개인청결/)).getByRole('img', { name: '3순위' }),
    ).toBeInTheDocument()
    expect(layerVariant('body')).toBe('personal-hygiene')
    expect(finish).toBeDisabled()

    click(/잠버릇/)
    click('완료하기')
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent?.replace(/\d/g, ''))).toEqual([
      '기상알람',
      '청소,청결',
      '개인청결',
      '흡연유무',
      '잠버릇',
    ])
    items.forEach((item, index) => {
      expect(
        within(item).getByRole('img', { name: `${index + 1}순위` }),
      ).toBeInTheDocument()
    })
  })

  it('moves the character with the ranks when a selection is cancelled', () => {
    renderPriorityStep()

    click(/잠버릇/)
    click(/기상알람/)
    click(/청소,청결/)
    click(/잠버릇/)

    expect(layerVariant('head')).toBe('wake-alarm')
    expect(layerVariant('hand')).toBe('cleaning')
    expect(layerVariant('body')).toBe('default')
    expect(screen.getByRole('button', { name: '완료하기' })).toBeDisabled()
  })

  it('shows the result on the complete screen after the full flow', () => {
    renderAt(ONBOARDING_ROUTES.school)

    completeSchoolStep()
    completeProfileStep()
    completeDormitoryStep()
    click(/잠버릇/)
    click(/흡연유무/)
    click(/청소,청결/)
    click(/기상알람/)
    click(/개인청결/)
    click('완료하기')

    expect(
      screen.getByRole('heading', { name: /등록완료!/ }),
    ).toBeInTheDocument()
    const chips = screen
      .getAllByRole('listitem')
      .map((el) => el.textContent?.replace(/\d/g, ''))
    expect(chips).toEqual([
      '잠버릇',
      '흡연유무',
      '청소,청결',
      '기상알람',
      '개인청결',
    ])
    expect(layerVariant('head')).toBe('sleep-habit')
    expect(layerVariant('hand')).toBe('smoking')
    expect(layerVariant('body')).toBe('cleaning')
  })

  it('keeps entered values through a round trip to the login page', () => {
    renderAt(ONBOARDING_ROUTES.login)
    click('Sign up with Google')
    type('학과', '소프트웨어학부')
    type('학번', '20261234')

    click('이전')
    expect(
      screen.getByRole('button', { name: 'Sign up with Google' }),
    ).toBeInTheDocument()
    click('Sign up with Google')

    expect(screen.getByLabelText('학과')).toHaveValue('소프트웨어학부')
    expect(screen.getByLabelText('학번')).toHaveValue('20261234')
  })

  it('keeps moving between finished steps after completing them', () => {
    renderPriorityStep()

    click('이전')
    expectHeading('기숙사 정보를 등록해주세요')
    expect(screen.getByLabelText('방 타입')).toHaveValue('A동')

    click('이전')
    expectHeading('내 정보를 등록해주세요')
    click('이전')
    expectHeading('학교 정보를 등록해주세요')

    click('다음으로')
    click('다음으로')
    click('다음으로')
    expect(screen.getByRole('button', { name: '완료하기' })).toBeInTheDocument()
  })

  it('returns from the complete screen with the ranks kept', () => {
    renderPriorityStep()
    click(/개인청결/)
    click(/기상알람/)
    click(/잠버릇/)
    click(/청소,청결/)
    click(/흡연유무/)
    click('완료하기')
    expectHeading(/등록완료!/)
    expect(layerVariant('head')).toBe('personal-hygiene')

    click('이전')

    expect(within(chip(/개인청결/)).getByAltText('1순위')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '완료하기' })).toBeEnabled()
  })
})

describe('onboarding step guard', () => {
  const COMPLETE_DATA: OnboardingData = {
    department: '학과',
    studentId: '1',
    name: '이름',
    gender: 'male',
    birthYear: 2005,
    dormitory: '기숙사',
    roomType: 'A',
    roomCapacity: 2,
    priorities: [
      'sleep-habit',
      'cleaning',
      'smoking',
      'wake-alarm',
      'personal-hygiene',
    ],
  }

  it.each([
    ONBOARDING_ROUTES.profile,
    ONBOARDING_ROUTES.dormitory,
    ONBOARDING_ROUTES.priority,
    ONBOARDING_ROUTES.complete,
    '/onboarding/complete/',
    '/ONBOARDING/COMPLETE',
    '/onboarding/priority/',
  ])('sends a direct visit to %s back to the school step', (path) => {
    renderAt(path)

    expectHeading('학교 정보를 등록해주세요')
    expect(
      screen.queryByRole('heading', { name: /등록완료!/ }),
    ).not.toBeInTheDocument()
  })

  it('sends the user to the earliest missing step, not the first one', () => {
    renderWithUrlEntry(ONBOARDING_ROUTES.school, ONBOARDING_ROUTES.priority)
    completeSchoolStep()

    enterUrl()

    expectHeading('내 정보를 등록해주세요')
    click('이전')
    expect(screen.getByLabelText('학과')).toHaveValue('소프트웨어학부')
  })

  it('blocks the complete screen until three priorities are selected', () => {
    renderWithUrlEntry(ONBOARDING_ROUTES.school, ONBOARDING_ROUTES.complete)
    completeSchoolStep()
    completeProfileStep()
    completeDormitoryStep()
    click(/잠버릇/)
    click(/청소,청결/)

    enterUrl()

    expect(
      screen.queryByRole('heading', { name: /등록완료!/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '완료하기' })).toBeDisabled()
    expect(within(chip(/잠버릇/)).getByAltText('1순위')).toBeInTheDocument()
  })

  it('checks every earlier step for the complete screen', () => {
    const route = ONBOARDING_ROUTES.complete

    expect(getRequiredStepRoute(COMPLETE_DATA, route)).toBeNull()
    expect(
      getRequiredStepRoute({ ...COMPLETE_DATA, department: ' ' }, route),
    ).toBe(ONBOARDING_ROUTES.school)
    expect(
      getRequiredStepRoute({ ...COMPLETE_DATA, gender: null }, route),
    ).toBe(ONBOARDING_ROUTES.profile)
    expect(
      getRequiredStepRoute({ ...COMPLETE_DATA, roomCapacity: null }, route),
    ).toBe(ONBOARDING_ROUTES.dormitory)
    expect(
      getRequiredStepRoute({ ...COMPLETE_DATA, priorities: [] }, route),
    ).toBe(ONBOARDING_ROUTES.priority)
  })

  it('only checks the steps before the requested one', () => {
    expect(
      getRequiredStepRoute(
        { ...INITIAL_ONBOARDING_DATA, department: '학과', studentId: '1' },
        ONBOARDING_ROUTES.profile,
      ),
    ).toBeNull()
  })

  it('opens each later step from the development preview', () => {
    renderAt('/dev/onboarding')
    click(ONBOARDING_ROUTES.complete)

    expectHeading(/등록완료!/)
    expect(localStorage).toHaveLength(0)
  })
})

describe('birth year sheet focus', () => {
  function openSheet() {
    renderProfileStep()
    const trigger = screen.getByRole('button', {
      name: '출생년도를 선택해주세요',
    })
    trigger.focus()
    fireEvent.click(trigger)
    return { trigger, sheet: screen.getByRole('dialog', { name: '연도 선택' }) }
  }

  const buttonsIn = (sheet: HTMLElement) => within(sheet).getAllByRole('button')

  it('moves focus into the sheet and makes the background inert', () => {
    const { trigger, sheet } = openSheet()

    expect(sheet).toHaveFocus()
    expect(trigger.closest('[inert]')).not.toBeNull()
    expect(sheet.closest('[inert]')).toBeNull()
  })

  it('wraps Tab from the last button to the first', () => {
    const { sheet } = openSheet()
    const buttons = buttonsIn(sheet)
    buttons[buttons.length - 1].focus()

    fireEvent.keyDown(document.activeElement as Element, { key: 'Tab' })

    expect(buttons[0]).toHaveFocus()
  })

  it('wraps Shift+Tab from the first button to the last', () => {
    const { sheet } = openSheet()
    const buttons = buttonsIn(sheet)
    buttons[0].focus()

    fireEvent.keyDown(buttons[0], { key: 'Tab', shiftKey: true })

    expect(buttons[buttons.length - 1]).toHaveFocus()
  })

  it('wraps Shift+Tab from the sheet itself to the last button', () => {
    const { sheet } = openSheet()
    const buttons = buttonsIn(sheet)

    fireEvent.keyDown(sheet, { key: 'Tab', shiftKey: true })

    expect(buttons[buttons.length - 1]).toHaveFocus()
  })

  it('closes with Escape, returns focus, and restores the background', () => {
    const { trigger, sheet } = openSheet()

    fireEvent.keyDown(sheet, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger.closest('[inert]')).toBeNull()
  })

  it('returns focus to the same button after choosing a year', () => {
    const { sheet } = openSheet()

    fireEvent.click(within(sheet).getByRole('button', { name: '선택하기' }))

    expect(screen.getByRole('button', { name: '2005' })).toHaveFocus()
  })

  it('closes when the area outside the sheet is tapped', () => {
    const { trigger, sheet } = openSheet()

    fireEvent.click(sheet.parentElement as Element)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps focus inside when the focused year leaves the range', () => {
    const { sheet } = openSheet()
    for (let i = 0; i < 5; i++) fireEvent.keyDown(sheet, { key: 'ArrowDown' })
    expect(within(sheet).getByTestId('selected-year')).toHaveTextContent('2010')

    const edge = within(sheet).getByRole('button', { name: '2012' })
    edge.focus()
    fireEvent.click(edge)

    expect(within(sheet).queryByRole('button', { name: '2012' })).toBeNull()
    expect(sheet).toHaveFocus()
  })
})

describe('survey connection', () => {
  it('moves from the complete screen to the survey and back', () => {
    renderPriorityStep()
    click(/잠버릇/)
    click(/기상알람/)
    click(/청소,청결/)
    click(/개인청결/)
    click(/흡연유무/)
    click('완료하기')
    expectHeading(/등록완료!/)

    click('시작하기!')

    expect(screen.getByRole('button', { name: '뒤로' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /등록완료!/ }),
    ).not.toBeInTheDocument()

    click('뒤로')

    expectHeading(/등록완료!/)
    expect(layerVariant('head')).toBe('sleep-habit')
  })
})

describe('bottom button', () => {
  it('uses the shared footer on every step', () => {
    renderAt(ONBOARDING_ROUTES.school)
    const expectInFooter = (name: string) =>
      expect(
        within(screen.getByTestId('onboarding-footer')).getByRole('button', {
          name,
        }),
      ).toBeInTheDocument()

    expectInFooter('다음으로')
    completeSchoolStep()
    expectInFooter('다음으로')
    completeProfileStep()
    expectInFooter('다음으로')
    completeDormitoryStep()
    expectInFooter('완료하기')
    click(/잠버릇/)
    click(/기상알람/)
    click(/청소,청결/)
    click(/개인청결/)
    click(/흡연유무/)
    click('완료하기')
    expectInFooter('시작하기!')
  })
})

describe('room capacity', () => {
  const NOTICE = 'MVP로 아직 4인실과 6인실 매칭을 지원하지 않습니다.'

  function renderDormitoryStep() {
    renderProfileStep()
    completeProfileStep()
  }

  const expectPressed = (label: string, pressed: boolean) =>
    expect(screen.getByRole('button', { name: label })).toHaveAttribute(
      'aria-pressed',
      String(pressed),
    )

  it('starts on 2인실 without the notice', () => {
    renderDormitoryStep()

    expectPressed('2인실', true)
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })

  it.each(['4인실', '6인실'])(
    'shows the notice and keeps 2인실 selected when %s is pressed',
    (label) => {
      renderDormitoryStep()

      click(label)

      expect(screen.getByRole('status')).toHaveTextContent(NOTICE)
      expectPressed('2인실', true)
      expectPressed(label, false)
    },
  )

  it('hides the notice after about 3 seconds', () => {
    renderDormitoryStep()
    vi.useFakeTimers()
    click('4인실')

    act(() => vi.advanceTimersByTime(ROOM_NOTICE_MS - 1))
    expect(screen.getByText(NOTICE)).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
    expectPressed('2인실', true)
    vi.useRealTimers()
  })

  it('restarts the time on each press, and works again after closing', () => {
    renderDormitoryStep()
    vi.useFakeTimers()
    click('4인실')
    act(() => vi.advanceTimersByTime(ROOM_NOTICE_MS - 1))

    click('6인실')
    act(() => vi.advanceTimersByTime(ROOM_NOTICE_MS - 1))
    expect(screen.getByText(NOTICE)).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()

    click('4인실')
    expect(screen.getByText(NOTICE)).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('hides the notice when 2인실 is pressed', () => {
    renderDormitoryStep()
    click('4인실')

    click('2인실')

    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument()
  })

  it('still needs the text fields to continue', () => {
    renderDormitoryStep()

    click('다음으로')

    expectHeading('기숙사 정보를 등록해주세요')
  })
})

describe('mission notice', () => {
  const mission = () => screen.queryByRole('dialog', { name: '미션 안내' })
  const pass = (ms: number) => act(() => vi.advanceTimersByTime(ms))

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows on the first visit and closes by itself after 3-4 seconds', () => {
    vi.useFakeTimers()
    renderPriorityStep()

    expect(mission()).toBeInTheDocument()
    expect(MISSION_NOTICE_MS).toBeGreaterThanOrEqual(3000)
    expect(MISSION_NOTICE_MS).toBeLessThanOrEqual(4000)

    pass(MISSION_NOTICE_MS - 1)
    expect(mission()).toBeInTheDocument()

    pass(1)
    expect(mission()).not.toBeInTheDocument()
  })

  it('shows again from the info button, for the same time', () => {
    vi.useFakeTimers()
    renderPriorityStep()
    pass(MISSION_NOTICE_MS)

    click('미션 안내 보기')
    expect(mission()).toBeInTheDocument()

    pass(MISSION_NOTICE_MS)
    expect(mission()).not.toBeInTheDocument()
  })

  it('does not show by itself when coming back to the step', () => {
    renderPriorityStep()
    fireEvent.keyDown(mission() as Element, { key: 'Escape' })

    click('이전')
    click('다음으로')

    expect(mission()).not.toBeInTheDocument()
  })

  it('moves focus in, blocks the background, and returns focus to the info button', () => {
    renderPriorityStep()
    const info = screen.getByRole('button', { name: '미션 안내 보기' })
    expect(mission()).toHaveFocus()
    expect(info.closest('[inert]')).not.toBeNull()

    fireEvent.keyDown(mission() as Element, { key: 'Escape' })

    expect(mission()).not.toBeInTheDocument()
    expect(info).toHaveFocus()
    expect(info.closest('[inert]')).toBeNull()
  })

  it('keeps the character rules when the notice is closed', () => {
    renderPriorityStep()
    fireEvent.click((mission() as Element).parentElement as Element)
    expect(mission()).not.toBeInTheDocument()

    click(/흡연유무/)

    expect(layerVariant('head')).toBe('smoking')
  })
})
