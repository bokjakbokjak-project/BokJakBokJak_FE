import { canUseTemporaryFlow } from './demoMode'
import { mockDormitoryApi } from './dormitoryApi.mock'

export type DormitoryOption = {
  id: string
  name: string
}

/** Contract to agree with the backend (OPEN_QUESTIONS BE-5). */
export type DormitoryApi = {
  search: (query: string) => Promise<DormitoryOption[]>
  create: (name: string) => Promise<DormitoryOption>
}

// Connection point for the real API. There is no server yet, so search finds nothing, which
// shows the plain Figma input, and create fails instead of pretending that it saved.
const serverDormitoryApi: DormitoryApi = {
  search: async () => [],
  create: async () => {
    throw new Error('The dormitory API is not connected yet.')
  },
}

export const dormitoryApi: DormitoryApi = canUseTemporaryFlow()
  ? mockDormitoryApi
  : serverDormitoryApi
