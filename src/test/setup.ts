import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom loads no images, so none would ever report `complete`. Screens that wait for a picture
// (the survey's STEP screen) treat every picture as already loaded, as a cached one would be; a
// test that needs a picture still loading overrides this getter.
Object.defineProperty(HTMLImageElement.prototype, 'complete', {
  configurable: true,
  get: () => true,
})

afterEach(() => {
  cleanup()
})
