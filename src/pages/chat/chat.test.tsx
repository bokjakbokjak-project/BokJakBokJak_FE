import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { chatApi } from '../../lib/chat/chatApi'
import {
  getSampleChatRooms,
  resetMockChatRooms,
} from '../../lib/chat/chatApi.mock'
import { getCandidate } from '../../lib/roommate/roommateData'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }))

describe('chat', () => {
  beforeEach(() => {
    resetMockChatRooms()
  })

  it('lists every sample room with its state', async () => {
    renderAt('/chat')

    const rooms = await screen.findAllByRole('link', { name: /매칭률/ })
    expect(rooms).toHaveLength(8)
    expect(screen.getByText('민수정님과의 매칭이 완료되었어요')).toBeVisible()
    expect(screen.getByText('전혜윤님과의 매칭이 종료되었어요')).toBeVisible()
    expect(screen.getByText('남윤경님과의 매칭이 시작되었어요')).toBeVisible()
    expect(
      screen.getByRole('link', { name: '채팅', current: 'page' }),
    ).toBeInTheDocument()
  })

  it('opens a room from the list', async () => {
    renderAt('/chat')

    fireEvent.click(
      await screen.findByRole('link', { name: /^서유정님, 오늘, 매칭률 83%/ }),
    )

    expect(
      await screen.findByRole('heading', { name: '서유정님' }),
    ).toBeInTheDocument()
    expect(screen.getByText('1 시험기간, 밤늦은 공부')).toBeInTheDocument()
  })

  it('sends a message only when there is text', async () => {
    renderAt('/chat/kimhyena')
    const input = await screen.findByRole('textbox', { name: '메시지 입력' })
    const send = screen.getByRole('button', { name: '메시지 보내기' })

    expect(send).toBeDisabled()
    fireEvent.change(input, { target: { value: '저는 12시 전에 잘게요' } })
    expect(send).toBeEnabled()
    fireEvent.click(send)

    const list = screen.getByRole('list', { name: '대화 내용' })
    expect(
      await within(list).findByText('저는 12시 전에 잘게요'),
    ).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('asks before voting for the next agenda', async () => {
    renderAt('/chat/seoyujeong')

    const vote = await screen.findByRole('button', {
      name: '다음 안건 진행하기',
    })
    fireEvent.click(vote)
    const dialog = screen.getByRole('dialog', {
      name: '이대로 확정하시겠습니까?',
    })
    expect(dialog).toHaveAccessibleDescription(
      /^안건을 확정하면 다시 수정할 수 없어요\s*AI가 다음 안건으로 이동해요$/,
    )

    fireEvent.click(within(dialog).getByRole('button', { name: '취소하기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(vote).toHaveAccessibleName('다음 안건 진행하기')

    fireEvent.click(vote)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('toggles the agenda vote', async () => {
    renderAt('/chat/seoyujeong')

    fireEvent.click(
      await screen.findByRole('button', { name: '다음 안건 진행하기' }),
    )
    click('확정하기')
    expect(
      await screen.findByRole('button', { name: '안건 확정 취소하기' }),
    ).toBeInTheDocument()

    click('안건 확정 취소하기')
    expect(
      await screen.findByRole('button', { name: '다음 안건 진행하기' }),
    ).toBeInTheDocument()
  })

  it('shows the confirmed match instead of the agenda button', async () => {
    renderAt('/chat/minsujeong')

    expect(await screen.findByRole('status')).toHaveTextContent(
      '매칭이 확정되었습니다',
    )
    expect(screen.getByText('2 배달 음식과 쓰레기 처리 확정!')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: '다음 안건 진행하기' }),
    ).not.toBeInTheDocument()
  })

  it('locks an ended room', async () => {
    renderAt('/chat/jeonhyeyun')

    expect(await screen.findByText(/님이 방을 나갔습니다/)).toBeVisible()
    expect(screen.getByRole('textbox', { name: '메시지 입력' })).toBeDisabled()

    fireEvent.click(screen.getByRole('link', { name: '채팅방 메뉴' }))
    expect(
      await screen.findByRole('button', { name: '채팅방 종료하기' }),
    ).toBeDisabled()
  })

  it('ends a room from the menu', async () => {
    renderAt('/chat/namyungyeong/menu')

    expect(await screen.findByText('님과의 채팅')).toBeInTheDocument()
    click('채팅방 종료하기')

    expect(
      await screen.findByText('남윤경님과의 매칭이 종료되었어요'),
    ).toBeVisible()
  })

  it('opens the partner profile and returns to the room', async () => {
    renderAt('/chat/jeonhyeyun')

    // Every message group from the partner shows the picture, and each one opens the profile.
    const pictures = await screen.findAllByRole('link', {
      name: '전혜윤님 프로필 보기',
    })
    expect(pictures).toHaveLength(2)
    fireEvent.click(pictures[0])
    expect(
      await screen.findByRole('heading', { name: '혜윤님과의 나의 매칭결과' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '상세프로필 보기 →' }))
    fireEvent.click(screen.getByRole('link', { name: '이전' }))
    expect(
      screen.getByRole('heading', { name: '혜윤님과의 나의 매칭결과' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: '이전' }))
    expect(
      await screen.findByRole('heading', { name: '전혜윤님' }),
    ).toBeInTheDocument()
  })

  it('gives every sample room a partner in the roommate sample data', () => {
    for (const room of getSampleChatRooms()) {
      const candidate = getCandidate(room.candidateId)
      expect(candidate?.name, room.id).toBe(room.partnerName)
      expect(candidate?.matchRate, room.id).toBe(room.matchRate)
    }
  })

  it('shows the waiting vote when I already asked for the next agenda', async () => {
    renderAt('/chat/iseoyun')

    expect(
      await screen.findByRole('button', { name: '안건 확정 취소하기' }),
    ).toBeInTheDocument()
  })

  it('goes back to the chat list from the room', async () => {
    renderAt('/chat/seoyujeong')

    fireEvent.click(
      await screen.findByRole('link', { name: '채팅 목록으로 돌아가기' }),
    )

    expect(
      await screen.findByRole('heading', { name: '채팅' }),
    ).toBeInTheDocument()
  })

  it('shows the latest message and the unread count for new messages', async () => {
    renderAt('/chat')

    const room = await screen.findByRole('link', {
      name: /^박지민님, 어제, 매칭률 67%, 새 메시지 2개, /,
    })
    expect(room).toHaveTextContent(
      '저는 방에서 거의 안 먹어서 바로만 치워주시면 돼요',
    )
    expect(within(room).getByText('2')).toBeVisible()
  })

  it('clears the unread count once the room is opened', async () => {
    renderAt('/chat')

    fireEvent.click(
      await screen.findByRole('link', { name: /^서유정님, .*새 메시지 1개/ }),
    )
    await screen.findByRole('heading', { name: '서유정님' })
    cleanup()
    renderAt('/chat')

    const room = await screen.findByRole('link', { name: /^서유정님/ })
    expect(room).not.toHaveAccessibleName(/새 메시지/)
    expect(room).toHaveTextContent('서유정님과의 매칭이 시작되었어요')
  })

  it('sends an unknown room back to the list', async () => {
    renderAt('/chat/unknown')

    expect(
      await screen.findByRole('heading', { name: '채팅' }),
    ).toBeInTheDocument()
  })
})

// jsdom has no layout, so these check the structure that keeps the bar on screen (C-1): a page
// as tall as the screen or the PC frame, a list that scrolls by itself, and the bar outside it.
describe('chat list layout', () => {
  beforeEach(() => {
    resetMockChatRooms()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function expectFixedBar() {
    const scroller = screen.getByTestId('chat-list-scroll')
    const nav = screen.getByRole('navigation')
    const page = scroller.parentElement

    expect(page).toHaveClass(
      'h-[calc(100dvh-env(safe-area-inset-top))]',
      'md:h-[844px]',
      'overflow-hidden',
    )
    expect(scroller).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto')
    expect(scroller).not.toContainElement(nav)
    expect(nav.parentElement).toBe(page)
    expect(
      screen.getByRole('heading', { name: '채팅' }).closest('header')
        ?.parentElement,
    ).toBe(page)
    expect(
      within(nav).getByRole('link', { name: '채팅', current: 'page' }),
    ).toBeInTheDocument()
  }

  it('keeps all eight rooms in the scrolling list and the bar outside it', async () => {
    renderAt('/chat')

    const rooms = await screen.findAllByRole('link', { name: /매칭률/ })
    expect(rooms).toHaveLength(8)
    rooms.forEach((room) =>
      expect(screen.getByTestId('chat-list-scroll')).toContainElement(room),
    )
    expectFixedBar()
  })

  it('keeps the same layout with one room', async () => {
    const [first] = getSampleChatRooms()
    vi.spyOn(chatApi, 'listRooms').mockResolvedValue([first])
    renderAt('/chat')

    expect(await screen.findAllByRole('link', { name: /매칭률/ })).toHaveLength(
      1,
    )
    expectFixedBar()
  })

  it('keeps the same layout with no rooms', async () => {
    vi.spyOn(chatApi, 'listRooms').mockResolvedValue([])
    renderAt('/chat')

    expect(await screen.findByText('아직 채팅방이 없어요')).toBeInTheDocument()
    expectFixedBar()
  })
})
