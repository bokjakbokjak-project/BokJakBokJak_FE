import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CharacterPreview from './CharacterPreview'

describe('CharacterPreview greeting', () => {
  it('opens the eyes of a smiling head and nods the head only', () => {
    render(<CharacterPreview priorities={[]} greet />)

    const eyes = screen.getByTestId('greet-eyes')
    expect(eyes).toHaveClass('motion-safe:animate-greet-eyes')
    const head = document.querySelector('[data-layer="head"]')!
    expect(head.parentElement).toHaveClass('motion-safe:animate-greet-nod')
    expect(head.parentElement).toContainElement(eyes)
    expect(document.querySelector('[data-layer="hand"]')!.parentElement).toBe(
      screen.getByRole('img'),
    )
  })

  it('keeps heads that already have open eyes as they are', () => {
    render(<CharacterPreview priorities={['cleaning']} greet />)

    expect(screen.queryByTestId('greet-eyes')).not.toBeInTheDocument()
  })

  it('does not animate without the greeting', () => {
    render(<CharacterPreview priorities={[]} />)

    expect(screen.queryByTestId('greet-eyes')).not.toBeInTheDocument()
    expect(document.querySelector('[data-layer="head"]')!.parentElement).toBe(
      screen.getByRole('img'),
    )
  })
})
