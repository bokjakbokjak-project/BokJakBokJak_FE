import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

async function loadOnProduction() {
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_DEMO_MODE', 'false')
  vi.resetModules()
  return import('./qaMode')
}

describe('QA mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.useRealTimers()
    sessionStorage.clear()
  })

  it('stays off on Production until ?qa=1, and ?qa=0 turns it off', async () => {
    const { isQaMode, readQaFlagFromUrl } = await loadOnProduction()

    expect(isQaMode()).toBe(false)
    readQaFlagFromUrl('?qa=1')
    expect(isQaMode()).toBe(true)
    readQaFlagFromUrl('?other=1')
    expect(isQaMode()).toBe(true)
    readQaFlagFromUrl('?qa=0')
    expect(isQaMode()).toBe(false)
  })

  it('skips the survey to the loading screen and the result', () => {
    vi.useFakeTimers()
    renderAt('/question')

    fireEvent.click(
      screen.getByRole('button', { name: '테스트: 설문 건너뛰기' }),
    )
    expect(screen.getByText('프로필을 만들고 있어요')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(2000))
    expect(
      screen.getByRole('heading', { name: '상세 프로필' }),
    ).toBeInTheDocument()
  })
})

describe('first screen address', () => {
  it('shows the login screen at / and sends /login there', () => {
    renderAt('/')
    expect(
      screen.getByRole('button', { name: 'Sign up with Google' }),
    ).toBeInTheDocument()
  })

  it('keeps old /login links working', () => {
    renderAt('/login')
    expect(
      screen.getByRole('button', { name: 'Sign up with Google' }),
    ).toBeInTheDocument()
  })
})
