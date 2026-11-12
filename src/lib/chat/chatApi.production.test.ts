import { afterEach, describe, expect, it, vi } from 'vitest'

// The API is chosen when the module loads, so each test loads it again with Production settings.
async function loadProductionChatApi() {
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_DEMO_MODE', 'false')
  vi.resetModules()
  return import('./chatApi')
}

describe('chat API on Production', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('shows only the marked sample rooms', async () => {
    const { chatApi, isChatSampleOnly, PRODUCTION_SAMPLE_ROOM_IDS } =
      await loadProductionChatApi()

    expect(isChatSampleOnly).toBe(true)
    const rooms = await chatApi.listRooms()
    expect(rooms.map(({ id }) => id)).toEqual(PRODUCTION_SAMPLE_ROOM_IDS)
    expect(PRODUCTION_SAMPLE_ROOM_IDS).toHaveLength(2)
  })

  it('opens a sample room but no other room', async () => {
    const { chatApi } = await loadProductionChatApi()

    expect(await chatApi.getRoom('seoyujeong')).toMatchObject({
      partnerName: '서유정',
    })
    expect(await chatApi.getRoom('minsujeong')).toBeNull()
  })
})
