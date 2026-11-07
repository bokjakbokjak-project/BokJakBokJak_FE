export const ROOMMATE_ROUTES = {
  list: '/roommate',
  analysis: (id: string) => `/roommate/${id}`,
  profile: (id: string) => `/roommate/${id}/profile`,
} as const
