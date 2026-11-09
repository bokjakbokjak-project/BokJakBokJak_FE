import legSrc from '../../assets/characters/base/leg.svg'
import rugSrc from '../../assets/characters/base/rug.png'
import shadowSrc from '../../assets/characters/base/shadow.svg'
import tailSrc from '../../assets/characters/base/tail.svg'
import bodyCleaning from '../../assets/characters/body/cleaning.svg'
import bodyDefault from '../../assets/characters/body/default.svg'
import bodyHygiene from '../../assets/characters/body/personal-hygiene.svg'
import bodySleep from '../../assets/characters/body/sleep-habit.svg'
import bodySmoking from '../../assets/characters/body/smoking.svg'
import bodyAlarm from '../../assets/characters/body/wake-alarm.svg'
import handCleaning from '../../assets/characters/hand/cleaning.svg'
import handDefault from '../../assets/characters/hand/default.svg'
import handHygiene from '../../assets/characters/hand/personal-hygiene.svg'
import handSleep from '../../assets/characters/hand/sleep-habit.svg'
import handSmoking from '../../assets/characters/hand/smoking.svg'
import handAlarm from '../../assets/characters/hand/wake-alarm.svg'
import headCleaning from '../../assets/characters/head/cleaning.svg'
import headDefault from '../../assets/characters/head/default.svg'
import headHygiene from '../../assets/characters/head/personal-hygiene.svg'
import headSleep from '../../assets/characters/head/sleep-habit.svg'
import headSmoking from '../../assets/characters/head/smoking.svg'
import headAlarm from '../../assets/characters/head/wake-alarm.svg'
import type { CategoryId } from './categories'

export type PartName = 'head' | 'hand' | 'body'
export type PartVariant = CategoryId | 'default'

type Asset = {
  src: string
  /** Horizontal shift when artwork overflows the part's Figma frame to the left. */
  offsetX?: number
  width: number
  height: number
}

/** Coordinate space of the Figma character group, shared by every screen. */
export const STAGE = { width: 302, height: 342 } as const

const PART_ORIGIN: Record<PartName, { x: number; y: number }> = {
  head: { x: 20, y: 0 },
  hand: { x: 70, y: 153 },
  body: { x: 86, y: 160.52 },
}

// `face` is part of each head asset, exported from a real Figma head instance.
const PART_ASSETS: Record<PartName, Record<PartVariant, Asset>> = {
  head: {
    default: { src: headDefault, width: 250, height: 214 },
    'sleep-habit': { src: headSleep, width: 250, height: 214 },
    'wake-alarm': { src: headAlarm, width: 250, height: 214 },
    cleaning: { src: headCleaning, width: 250, height: 214 },
    'personal-hygiene': { src: headHygiene, width: 250, height: 214 },
    smoking: { src: headSmoking, width: 250, height: 214 },
  },
  hand: {
    default: { src: handDefault, width: 149, height: 86 },
    'sleep-habit': {
      src: handSleep,
      offsetX: -31.84,
      width: 181,
      height: 132,
    },
    'wake-alarm': { src: handAlarm, width: 149, height: 86 },
    cleaning: { src: handCleaning, width: 149, height: 117 },
    'personal-hygiene': {
      src: handHygiene,
      offsetX: -34,
      width: 183,
      height: 116,
    },
    smoking: { src: handSmoking, width: 149, height: 86 },
  },
  body: {
    default: { src: bodyDefault, width: 117, height: 89 },
    'sleep-habit': { src: bodySleep, width: 118, height: 89 },
    'wake-alarm': { src: bodyAlarm, offsetX: -2.08, width: 122, height: 95 },
    cleaning: { src: bodyCleaning, width: 117, height: 92 },
    'personal-hygiene': { src: bodyHygiene, width: 118, height: 92 },
    smoking: { src: bodySmoking, width: 117, height: 96 },
  },
}

export type CharacterLayer = {
  key: string
  part?: PartName
  variant?: PartVariant
  src: string
  x: number
  y: number
  width: number
  height: number
}

/** Rank 1 sets the head, rank 2 the hand, and rank 3 the body. Ranks 4 and 5 change nothing. */
export function getPartVariants(
  priorities: readonly CategoryId[],
): Record<PartName, PartVariant> {
  return {
    head: priorities[0] ?? 'default',
    hand: priorities[1] ?? 'default',
    body: priorities[2] ?? 'default',
  }
}

function partLayer(part: PartName, variant: PartVariant): CharacterLayer {
  const asset = PART_ASSETS[part][variant]
  const origin = PART_ORIGIN[part]
  return {
    key: part,
    part,
    variant,
    src: asset.src,
    x: origin.x + (asset.offsetX ?? 0),
    y: origin.y,
    width: asset.width,
    height: asset.height,
  }
}

/** Layers from back to front, in the Figma order. */
export function getCharacterLayers(
  priorities: readonly CategoryId[],
): CharacterLayer[] {
  const variants = getPartVariants(priorities)
  return [
    { key: 'rug', src: rugSrc, x: 0, y: 191, width: 302, height: 151 },
    { key: 'tail', src: tailSrc, x: 162.95, y: 225.03, width: 43, height: 36 },
    { key: 'leg', src: legSrc, x: 126, y: 237.67, width: 38, height: 28 },
    partLayer('body', variants.body),
    partLayer('head', variants.head),
    partLayer('hand', variants.hand),
    { key: 'shadow', src: shadowSrc, x: 108, y: 253, width: 73, height: 19 },
  ]
}

/** Loads every part up front so swapping a part does not flash. */
export function preloadCharacterAssets() {
  for (const variants of Object.values(PART_ASSETS)) {
    for (const asset of Object.values(variants)) {
      new Image().src = asset.src
    }
  }
}
