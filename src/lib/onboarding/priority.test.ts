import { describe, expect, it } from 'vitest'
import { getCharacterLayers, getPartVariants } from './character'
import { CATEGORY_IDS, type CategoryId } from './categories'
import {
  MAX_PRIORITY_COUNT,
  MIN_PRIORITY_COUNT,
  getRank,
  isPriorityComplete,
  togglePriority,
} from './priority'

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
    expect(isPriorityComplete(priorities)).toBe(false)
  })

  it('pulls later ranks forward when one is deselected', () => {
    expect(
      togglePriority(['cleaning', 'smoking', 'sleep-habit'], 'cleaning'),
    ).toEqual(['smoking', 'sleep-habit'])
  })

  it('allows ranks 4 and 5, and completes only with all five', () => {
    let priorities = ['cleaning', 'smoking', 'sleep-habit'] as CategoryId[]
    priorities = togglePriority(priorities, 'wake-alarm')
    expect(getRank(priorities, 'wake-alarm')).toBe(4)
    expect(isPriorityComplete(priorities)).toBe(false)

    priorities = togglePriority(priorities, 'personal-hygiene')
    expect(getRank(priorities, 'personal-hygiene')).toBe(5)
    expect(isPriorityComplete(priorities)).toBe(true)
    expect(priorities).toHaveLength(MAX_PRIORITY_COUNT)
  })

  it('needs every priority (QA 3)', () => {
    expect(isPriorityComplete([])).toBe(false)
    expect(isPriorityComplete(['cleaning', 'smoking', 'sleep-habit'])).toBe(
      false,
    )
    expect(MIN_PRIORITY_COUNT).toBe(5)
  })

  it('ignores a selection beyond the maximum', () => {
    const all = [...CATEGORY_IDS]
    expect(togglePriority(all.slice(0, 4), all[4])).toEqual(all)
    expect(isPriorityComplete([...all, 'cleaning'])).toBe(false)
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

  it('ignores ranks 4 and 5', () => {
    expect(
      getPartVariants([
        'cleaning',
        'smoking',
        'wake-alarm',
        'sleep-habit',
        'personal-hygiene',
      ]),
    ).toEqual(getPartVariants(['cleaning', 'smoking', 'wake-alarm']))
  })

  it('draws the shadow behind the character and has no separate face layer', () => {
    for (const priorities of [
      [],
      ['sleep-habit', 'cleaning', 'smoking'],
      ['wake-alarm', 'personal-hygiene', 'cleaning'],
    ] as const) {
      expect(getCharacterLayers(priorities).map((layer) => layer.key)).toEqual([
        'rug',
        'shadow',
        'tail',
        'leg',
        'body',
        'head',
        'hand',
      ])
    }
  })
})
