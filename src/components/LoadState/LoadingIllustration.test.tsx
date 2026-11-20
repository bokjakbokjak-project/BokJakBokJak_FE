import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LoadingIllustration from './LoadingIllustration'

const shownCount = (container: HTMLElement) =>
  container.querySelectorAll('img[data-shown]').length

describe('loading illustration', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the things one by one from the left, then starts over', () => {
    vi.useFakeTimers()
    const { container } = render(<LoadingIllustration />)
    const things = [...container.querySelectorAll('img')].slice(1)
    // Left to right, the order they appear in.
    const lefts = things.map((image) => parseFloat(image.style.left))
    expect(lefts).toEqual([...lefts].sort((a, b) => a - b))

    expect(shownCount(container)).toBe(0)
    for (let count = 1; count <= 6; count += 1) {
      act(() => vi.advanceTimersByTime(350))
      expect(shownCount(container)).toBe(count)
      // Always the leftmost ones.
      expect(things[count - 1]).toHaveAttribute('data-shown')
    }
    // All of them stay a moment, then it starts over.
    act(() => vi.advanceTimersByTime(899))
    expect(shownCount(container)).toBe(6)
    act(() => vi.advanceTimersByTime(1))
    expect(shownCount(container)).toBe(0)
    act(() => vi.advanceTimersByTime(350))
    expect(shownCount(container)).toBe(1)
  })
})
