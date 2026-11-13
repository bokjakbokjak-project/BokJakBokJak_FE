import type { DormitoryApi, DormitoryOption } from './dormitoryApi'

// Development and demo sample data for the sample mode. Not real school data.
const dormitories: DormitoryOption[] = [
  {
    key: 'mock-1',
    name: '남산학사',
    roomTypes: [{ id: 1, name: '2인실', capacity: 2 }],
  },
  {
    key: 'mock-2',
    name: '남산학사 별관',
    roomTypes: [{ id: 2, name: '2인실', capacity: 2 }],
  },
]

const copy = (dormitory: DormitoryOption): DormitoryOption => ({
  ...dormitory,
  roomTypes: dormitory.roomTypes.map((roomType) => ({ ...roomType })),
})

export const mockDormitoryApi: DormitoryApi = {
  search: async (keyword) => {
    const query = keyword.replace(/\s+/g, '')
    return dormitories
      .filter(({ name }) => name.replace(/\s+/g, '').includes(query))
      .map(copy)
  },
  // Kept for the shared contract. The sample flow saves nothing, so it does not call this.
  register: async ({ name, roomTypeName, capacity }) => {
    let dormitory = dormitories.find((item) => item.name === name)
    if (!dormitory) {
      dormitory = { key: `mock-${dormitories.length + 1}`, name, roomTypes: [] }
      dormitories.push(dormitory)
    }
    let roomType = dormitory.roomTypes.find(
      (item) => item.name === roomTypeName && item.capacity === capacity,
    )
    if (!roomType) {
      const id = dormitories.flatMap((item) => item.roomTypes).length + 1
      roomType = { id, name: roomTypeName, capacity }
      dormitory.roomTypes.push(roomType)
    }
    return { key: dormitory.key, name: dormitory.name, roomTypes: [roomType] }
  },
}
