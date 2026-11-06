import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from './AppRoutes'

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  it('renders the start page at the root path', () => {
    renderAt('/')

    expect(
      screen.getByRole('heading', { name: '복작복작' }),
    ).toBeInTheDocument()
  })

  it('renders the 404 page for an unknown path', () => {
    renderAt('/unknown-path')

    expect(
      screen.getByRole('heading', { name: '페이지를 찾을 수 없습니다' }),
    ).toBeInTheDocument()
  })

  it('returns to the start page from the 404 page', () => {
    renderAt('/unknown-path')

    fireEvent.click(screen.getByRole('link', { name: '처음으로 돌아가기' }))

    expect(
      screen.getByRole('heading', { name: '복작복작' }),
    ).toBeInTheDocument()
  })
})
