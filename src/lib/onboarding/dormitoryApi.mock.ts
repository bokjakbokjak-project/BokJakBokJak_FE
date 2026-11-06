import type { DormitoryApi, DormitoryOption } from './dormitoryApi'

// Development-only sample data. Not real school data.
const dormitories: DormitoryOption[] = [
  { id: 'mock-1', name: '남산학사' },
  { id: 'mock-2', name: '남산학사 별관' },
]

// Lets the pending and failure states be seen in the browser. Type a name containing "오류".
const CREATE_DELAY_MS = 400
const FAILING_NAME = '오류'

export const mockDormitoryApi: DormitoryApi = {
  search: async (query) =>
    dormitories.filter(({ name }) => name.includes(query.trim())),
  create: async (name) => {
    await new Promise((resolve) => setTimeout(resolve, CREATE_DELAY_MS))
    if (name.includes(FAILING_NAME)) {
      throw new Error('Mock create failure')
    }
    const option = { id: `mock-${dormitories.length + 1}`, name }
    dormitories.push(option)
    return option
  },
}
