import { describe, expect, it } from 'vitest'
import { getFrameScale } from './frameScale'

describe('getFrameScale', () => {
  it('keeps the Figma size at a window height of 844px', () => {
    expect(getFrameScale(1280, 844)).toBe(1)
  })

  it('follows the window height on wide windows', () => {
    expect(getFrameScale(1920, 1080)).toBeCloseTo(1.28, 2)
    expect(getFrameScale(1280, 650)).toBeCloseTo(0.77, 2)
  })

  it('follows the window width when the frame would be wider than the window', () => {
    expect(getFrameScale(768, 2000)).toBeCloseTo(1.97, 2)
  })
})
