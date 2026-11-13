import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api/apiError'
import type {
  DormitoryApi,
  DormitoryOption,
} from '../../lib/onboarding/dormitoryApi'
import DormitoryField, { SEARCH_DEBOUNCE_MS } from './DormitoryField'

const OPTIONS: DormitoryOption[] = [
  {
    key: 'a',
    name: '남산학사',
    roomTypes: [{ id: 11, name: '2인실', capacity: 2 }],
  },
  {
    key: 'b',
    name: '남산학사 별관',
    roomTypes: [{ id: 12, name: '2인실', capacity: 2 }],
  },
]

function createApi(overrides: Partial<DormitoryApi> = {}): DormitoryApi {
  return {
    search: vi.fn(async () => OPTIONS),
    register: vi.fn(async () => OPTIONS[0]),
    ...overrides,
  }
}

const onSelect = vi.fn<(dormitory: DormitoryOption) => void>()

function Harness({ api }: { api: DormitoryApi }) {
  const [value, setValue] = useState('')
  return (
    <DormitoryField
      value={value}
      onChange={setValue}
      onSelect={onSelect}
      api={api}
    />
  )
}

afterEach(() => {
  onSelect.mockReset()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

function typeInto(text: string) {
  const input = screen.getByRole('combobox', { name: '기숙사' })
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: text } })
  return input
}

async function openList(api: DormitoryApi, text = '남산') {
  render(<Harness api={api} />)
  const input = typeInto(text)
  await screen.findByRole('listbox')
  return input
}

const waitForSearch = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, SEARCH_DEBOUNCE_MS + 60))
  })

const press = (input: HTMLElement, key: string) =>
  fireEvent.keyDown(input, { key })

const activeOption = (input: HTMLElement) =>
  document.getElementById(input.getAttribute('aria-activedescendant') ?? '')

describe('DormitoryField keyboard', () => {
  it('exposes the combobox state to assistive technology', async () => {
    const input = await openList(createApi())

    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute(
      'aria-controls',
      screen.getByRole('listbox').id,
    )
    expect(input).not.toHaveAttribute('aria-activedescendant')
  })

  it('moves through results with the arrow keys and wraps around', async () => {
    const input = await openList(createApi())

    press(input, 'ArrowDown')
    expect(activeOption(input)).toHaveTextContent('남산학사')
    expect(activeOption(input)).toHaveAttribute('aria-selected', 'true')

    press(input, 'ArrowDown')
    expect(activeOption(input)).toHaveTextContent('남산학사 별관')

    press(input, 'ArrowUp')
    press(input, 'ArrowUp')
    expect(activeOption(input)).toHaveTextContent('새로 추가')

    press(input, 'ArrowDown')
    expect(activeOption(input)).toHaveTextContent('남산학사')
  })

  it('confirms an existing result with Enter and reports the dormitory', async () => {
    const input = await openList(createApi())

    press(input, 'ArrowDown')
    press(input, 'ArrowDown')
    press(input, 'Enter')

    expect(input).toHaveValue('남산학사 별관')
    expect(onSelect).toHaveBeenLastCalledWith(OPTIONS[1])
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('does nothing on Enter when no result is active', async () => {
    const input = await openList(createApi())

    press(input, 'Enter')

    expect(input).toHaveValue('남산')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('keeps other results reachable when the input matches one exactly', async () => {
    const input = await openList(createApi(), '남산학사')

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '남산학사',
      '남산학사 별관',
    ])

    press(input, 'ArrowUp')
    press(input, 'Enter')

    expect(input).toHaveValue('남산학사 별관')
  })

  it('closes with Escape, and the arrow key opens it again', async () => {
    const input = await openList(createApi())

    press(input, 'ArrowDown')
    press(input, 'Escape')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-activedescendant')
    expect(input).toHaveValue('남산')

    press(input, 'ArrowDown')
    expect(await screen.findByRole('listbox')).toBeInTheDocument()
  })

  it('leaves Tab alone so focus moves to the next element', async () => {
    const input = await openList(createApi())

    // fireEvent returns false when preventDefault was called.
    expect(press(input, 'Tab')).toBe(true)
    fireEvent.blur(input)
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('ignores list keys during Korean IME composition', async () => {
    const input = await openList(createApi())

    press(input, 'ArrowDown')
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'ArrowDown', isComposing: true })

    expect(input).toHaveValue('남산')
    expect(activeOption(input)).toHaveTextContent('남산학사')
  })

  it('keeps mouse and touch selection', async () => {
    const input = await openList(createApi())

    const option = screen.getByRole('option', { name: '남산학사 별관' })
    // fireEvent returns false when preventDefault keeps focus on the input.
    expect(fireEvent.mouseDown(option)).toBe(false)
    fireEvent.click(option)

    expect(input).toHaveValue('남산학사 별관')
  })
})

describe('DormitoryField search', () => {
  it('waits for typing to pause and sends one search with the trimmed name', async () => {
    vi.useFakeTimers()
    const api = createApi()
    render(<Harness api={api} />)
    const input = typeInto('남')
    fireEvent.change(input, { target: { value: '남산' } })
    fireEvent.change(input, { target: { value: ' 남산학 ' } })

    await act(async () => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1)
    })
    expect(api.search).not.toHaveBeenCalled()
    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(api.search).toHaveBeenCalledTimes(1)
    expect(api.search).toHaveBeenCalledWith('남산학', expect.any(AbortSignal))
  })

  it('shows a pending line until the answer arrives', async () => {
    let resolve: (options: DormitoryOption[]) => void = () => {}
    const api = createApi({
      search: vi.fn(
        () =>
          new Promise<DormitoryOption[]>((next) => {
            resolve = next
          }),
      ),
    })
    render(<Harness api={api} />)
    typeInto('남산')

    expect(screen.getByRole('status')).toHaveTextContent('검색 중')
    await waitForSearch()
    await act(async () => resolve(OPTIONS))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('offers only the new entry when nothing is found, and keeps the typed name', async () => {
    const api = createApi({ search: vi.fn(async () => []) })
    const input = await openList(api, '새 기숙사')

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '‘새 기숙사’ 새로 추가',
    ])
    press(input, 'ArrowDown')
    press(input, 'Enter')

    expect(input).toHaveValue('새 기숙사')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('registers nothing when the new entry is chosen', async () => {
    const api = createApi({ search: vi.fn(async () => []) })
    await openList(api, '새 기숙사')

    fireEvent.click(screen.getByRole('option'))

    expect(api.register).not.toHaveBeenCalled()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('reports an exact match without changing the typed text', async () => {
    render(
      <Harness api={createApi({ search: vi.fn(async () => [OPTIONS[0]]) })} />,
    )
    const input = typeInto('남산학사 ')
    await waitForSearch()

    expect(onSelect).toHaveBeenCalledWith(OPTIONS[0])
    expect(input).toHaveValue('남산학사 ')
    // Nothing to choose when the only result is what is already typed.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('never lets an older answer replace a newer one', async () => {
    const pending: ((options: DormitoryOption[]) => void)[] = []
    const api = createApi({
      search: vi.fn(
        () =>
          new Promise<DormitoryOption[]>((next) => {
            pending.push(next)
          }),
      ),
    })
    render(<Harness api={api} />)
    const input = typeInto('남산')
    await waitForSearch()
    fireEvent.change(input, { target: { value: '남산학사 별' } })
    await waitForSearch()

    await act(async () => pending[1]([OPTIONS[1]]))
    await act(async () => pending[0](OPTIONS))

    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      '남산학사 별관',
      '‘남산학사 별’ 새로 추가',
    ])
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('cancels the search of an edited name', async () => {
    const signals: AbortSignal[] = []
    const api = createApi({
      search: vi.fn((_keyword: string, signal?: AbortSignal) => {
        if (signal) signals.push(signal)
        return new Promise<DormitoryOption[]>(() => {})
      }),
    })
    render(<Harness api={api} />)
    const input = typeInto('남산')
    await waitForSearch()
    fireEvent.change(input, { target: { value: '남산학사' } })

    expect(signals[0].aborted).toBe(true)
  })

  it('cancels the search when the screen closes', async () => {
    const signals: AbortSignal[] = []
    const api = createApi({
      search: vi.fn((_keyword: string, signal?: AbortSignal) => {
        if (signal) signals.push(signal)
        return new Promise<DormitoryOption[]>(() => {})
      }),
    })
    const { unmount } = render(<Harness api={api} />)
    typeInto('남산')
    await waitForSearch()
    unmount()

    expect(signals[0].aborted).toBe(true)
  })

  it('tells a network failure from a server failure, with no selectable list', async () => {
    const network = new ApiError({
      kind: 'network',
      status: null,
      code: 'NETWORK_ERROR',
      message: 'network',
    })
    render(
      <Harness
        api={createApi({
          search: vi.fn(async () => {
            throw network
          }),
        })}
      />,
    )
    const input = typeInto('남산')

    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('네트워크'),
    )
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).toHaveValue('남산')
  })

  it('reports a server failure', async () => {
    render(
      <Harness
        api={createApi({
          search: vi.fn(async () => {
            throw new ApiError({
              kind: 'http',
              status: 500,
              code: 'HTTP_500',
              message: 'server',
            })
          }),
        })}
      />,
    )
    typeInto('남산')

    await vi.waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '불러오지 못했습니다',
      ),
    )
  })

  it('does not search a name longer than the server accepts', async () => {
    const api = createApi()
    render(<Harness api={api} />)
    typeInto('가'.repeat(81))
    await waitForSearch()

    expect(api.search).not.toHaveBeenCalled()
  })
})

describe('DormitoryField by mode', () => {
  it('shows the list in demo mode', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    vi.stubEnv('VITE_VERCEL_ENV', 'preview')

    await openList(createApi())

    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('shows the list from the server in a production server build', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_API_MODE', 'server')

    await openList(createApi())

    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('shows only the plain input in a production sample build', async () => {
    vi.stubEnv('DEV', false)
    const api = createApi()
    render(<Harness api={api} />)
    typeInto('남산')
    await waitForSearch()

    expect(api.search).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
