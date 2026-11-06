export const FRAME_WIDTH = 390
export const FRAME_HEIGHT = 844

/** Largest scale at which the whole Figma frame fits the window. */
export function getFrameScale(windowWidth: number, windowHeight: number) {
  return Math.min(windowWidth / FRAME_WIDTH, windowHeight / FRAME_HEIGHT)
}
