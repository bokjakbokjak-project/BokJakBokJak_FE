import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  DormitoryApi,
  DormitoryOption,
} from '../../lib/onboarding/dormitoryApi'
import DormitoryField from './DormitoryField'

const OPTIONS = [
  { id: 'a', name: '남산학사' },
  { id: 'b', name: '남산학사 별관' },
]

function createApi(overrides: Partial<DormitoryApi> = {}): DormitoryApi {
  return {
    search: vi.fn(async () => OPTIONS),
    create: vi.fn(async (name: string) => ({ id: 'new', name })),
    ...overrides,
  }
}

function Harness({ api }: { api: DormitoryApi }) {
  const [value, setValue] = useState('')
  return <DormitoryField value={value} onChange={setValue} api={api} />
}

function deferredCreate() {
  let resolve: (option: DormitoryOption) => void = () => {}
  const create = vi.fn<DormitoryApi['create']>(
    () =>
      new Promise((next) => {
        resolve = next
      }),
  )
  return {
    create,
    resolveCreate: (option: DormitoryOption) => resolve(option),
  }
}

async function openList(api: DormitoryApi, text = '남산') {
  render(<Harness api={api} />)
  const input = screen.getByRole('combobox', { name: '기숙사' })
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: text } })
  await screen.findByRole('listbox')
  return input
}

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

  it('confirms an existing result with Enter', async () => {
    const input = await openList(createApi())

    press(input, 'ArrowDown')
    press(input, 'ArrowDown')
    press(input, 'Enter')

    expect(input).toHaveValue('남산학사 별관')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })

  it('adds a new dormitory with the keyboard only', async () => {
    const api = createApi({ search: vi.fn(async () => []) })
    const input = await openList(api, '새 기숙사')

    press(input, 'ArrowDown')
    press(input, 'Enter')

    expect(api.create).toHaveBeenCalledWith('새 기숙사')
    await vi.waitFor(() =>
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
    )
    expect(input).toHaveValue('새 기숙사')
  })

  it('does nothing on Enter when no result is active', async () => {
    const api = createApi()
    const input = await openList(api)

    press(input, 'Enter')

    expect(input).toHaveValue('남산')
    expect(api.create).not.toHaveBeenCalled()
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

  it('shows no list when the only result is the exact match', async () => {
    render(
      <Harness api={createApi({ search: vi.fn(async () => [OPTIONS[0]]) })} />,
    )
    const input = screen.getByRole('combobox', { name: '기숙사' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '남산학사' } })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 260))
    })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
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

describe('DormitoryField outside development', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const typeAndWait = async (api: DormitoryApi) => {
    render(<Harness api={api} />)
    const input = screen.getByRole('combobox', { name: '기숙사' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '남산' } })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 260))
    })
  }

  it('shows the list in demo mode', async () => {
    vi.stubEnv('DEV', false)
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    vi.stubEnv('VITE_VERCEL_ENV', 'preview')

    await typeAndWait(createApi())

    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('shows only the plain input in production', async () => {
    vi.stubEnv('DEV', false)

    await typeAndWait(createApi())

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})

describe('DormitoryField new dormitory request', () => {
  it('sends one request and shows progress while it is pending', async () => {
    const { create, resolveCreate } = deferredCreate()
    const api = createApi({
      search: vi.fn(async () => []),
      create,
    })
    const input = await openList(api, '새 기숙사')
    const option = screen.getByRole('option')

    fireEvent.click(option)
    fireEvent.click(option)

    expect(api.create).toHaveBeenCalledTimes(1)
    expect(option).toHaveTextContent('추가 중')
    expect(option).toHaveAttribute('aria-disabled', 'true')

    await act(async () => resolveCreate({ id: 'n', name: '새 기숙사' }))
    expect(input).toHaveValue('새 기숙사')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a failure message, keeps the input, and allows a retry', async () => {
    const create = vi
      .fn<DormitoryApi['create']>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ id: 'n', name: '새 기숙사' })
    const input = await openList(
      createApi({ search: vi.fn(async () => []), create }),
      '새 기숙사',
    )

    press(input, 'ArrowDown')
    press(input, 'Enter')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '추가하지 못했습니다',
    )
    expect(input).toHaveValue('새 기숙사')

    press(input, 'Enter')
    await vi.waitFor(() => expect(create).toHaveBeenCalledTimes(2))
    await vi.waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    )
  })

  it('clears the failure message when the name is edited', async () => {
    const input = await openList(
      createApi({
        search: vi.fn(async () => []),
        create: vi.fn(async () => {
          throw new Error('network')
        }),
      }),
      '새 기숙사',
    )

    fireEvent.click(screen.getByRole('option'))
    await screen.findByRole('alert')

    fireEvent.change(input, { target: { value: '다른 이름' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not overwrite an input edited while the request was pending', async () => {
    const { create, resolveCreate } = deferredCreate()
    const input = await openList(
      createApi({
        search: vi.fn(async () => []),
        create,
      }),
      '새 기숙사',
    )

    fireEvent.click(screen.getByRole('option'))
    fireEvent.change(input, { target: { value: '다른 이름' } })
    await act(async () => resolveCreate({ id: 'n', name: '새 기숙사' }))

    expect(input).toHaveValue('다른 이름')
  })

  it('keeps a result chosen while the new request was pending', async () => {
    const { create, resolveCreate } = deferredCreate()
    const input = await openList(
      createApi({
        create,
      }),
    )

    fireEvent.click(screen.getByRole('option', { name: /새로 추가/ }))
    fireEvent.click(screen.getByRole('option', { name: '남산학사 별관' }))
    await act(async () => resolveCreate({ id: 'n', name: '남산' }))

    expect(input).toHaveValue('남산학사 별관')
  })

  it('reports a search failure without a selectable list', async () => {
    render(
      <Harness
        api={createApi({
          search: vi.fn(async () => {
            throw new Error('network')
          }),
        })}
      />,
    )
    const input = screen.getByRole('combobox', { name: '기숙사' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '남산' } })

    expect(await screen.findByRole('status')).toHaveTextContent(
      '불러오지 못했습니다',
    )
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })
})
