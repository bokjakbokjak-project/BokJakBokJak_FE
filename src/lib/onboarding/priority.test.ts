import { describe, expect, it } from 'vitest'
import { getCharacterLayers, getPartVariants } from './character'
import { getRank, isPriorityComplete, togglePriority } from './priority'

describe('togglePriority', () => {
  it('assigns ranks in click order', () => {
    let priorities = togglePriority([], 'cleaning')
    priorities = togglePriority(priorities, 'smoking')
    priorities = togglePriority(priorities, 'sleep-habit')

    expect(priorities).toEqual(['cleaning', 'smoking', 'sleep-habit'])
    expect(getRank(priorities, 'cleaning')).toBe(1)
    expect(getRank(priorities, 'smoking')).toBe(2)
    expect(getRank(priorities, 'sleep-habit')).toBe(3)
    expect(getRank(priorities, 'wake-alarm')).toBeNull()
    expect(isPriorityComplete(priorities)).toBe(true)
  })

  it('pulls later ranks forward when one is deselected', () => {
    expect(
      togglePriority(['cleaning', 'smoking', 'sleep-habit'], 'cleaning'),
    ).toEqual(['smoking', 'sleep-habit'])
  })

  it('ignores a fourth selection', () => {
    expect(
      togglePriority(['cleaning', 'smoking', 'sleep-habit'], 'wake-alarm'),
    ).toEqual(['cleaning', 'smoking', 'sleep-habit'])
  })
})

describe('character parts', () => {
  it('maps rank 1 to head, rank 2 to hand, and rank 3 to body', () => {
    expect(getPartVariants([])).toEqual({
      head: 'default',
      hand: 'default',
      body: 'default',
    })
    expect(getPartVariants(['cleaning'])).toEqual({
      head: 'cleaning',
      hand: 'default',
      body: 'default',
    })
    expect(getPartVariants(['cleaning', 'smoking', 'wake-alarm'])).toEqual({
      head: 'cleaning',
      hand: 'smoking',
      body: 'wake-alarm',
    })
  })

  it('keeps the Figma layer order and has no separate face layer', () => {
    expect(getCharacterLayers([]).map((layer) => layer.key)).toEqual([
      'rug',
      'tail',
      'leg',
      'body',
      'head',
      'hand',
      'shadow',
    ])
  })
})
