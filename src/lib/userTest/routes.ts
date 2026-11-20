import { HOME_ROUTES } from '../home/routes'

export const USER_TEST_ROUTES = {
  /** The notice and the choice between the survey and browsing. */
  start: '/user-test',
} as const

/** The browse mode starts on the home, with the example character. */
export const DEMO_ENTRY_ROUTE = HOME_ROUTES.home
