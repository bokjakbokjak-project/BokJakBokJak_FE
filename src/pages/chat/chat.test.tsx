import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import AppRoutes from '../../app/AppRoutes'
import { resetMockChatRooms } from '../../lib/chat/chatApi.mock'

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

    const rooms = await screen.findAllByRole('link', { name: /님과의 매칭이/ })
    expect(rooms).toHaveLength(7)
    expect(screen.getByText('민수정님과의 매칭이 완료되었어요')).toBeVisible()
    expect(screen.getByText('전혜윤님과의 매칭이 종료되었어요')).toBeVisible()
    expect(screen.getByText('서유정님과의 매칭이 시작되었어요')).toBeVisible()
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

  it('toggles the agenda vote', async () => {
    renderAt('/chat/seoyujeong')

    fireEvent.click(
      await screen.findByRole('button', { name: '다음 안건 진행하기' }),
    )
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
    renderAt('/chat/hansuhui/menu')

    expect(await screen.findByText('님과의 채팅')).toBeInTheDocument()
    click('채팅방 종료하기')

    expect(
      await screen.findByText('한수희님과의 매칭이 종료되었어요'),
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

  it('keeps the partner picture plain when there is no profile', async () => {
    renderAt('/chat/hansuhui')

    expect(
      await screen.findByRole('heading', { name: '한수희님' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /프로필 보기/ }),
    ).not.toBeInTheDocument()
  })

  it('sends an unknown room back to the list', async () => {
    renderAt('/chat/unknown')

    expect(
      await screen.findByRole('heading', { name: '채팅' }),
    ).toBeInTheDocument()
  })
})
