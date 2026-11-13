import { afterEach, describe, expect, it, vi } from 'vitest'
import { canShareToKakao, shareProfileToKakao } from './kakaoShare'

function fakeKakao() {
  const sendDefault = vi.fn()
  const init = vi.fn()
  window.Kakao = {
    init,
    isInitialized: () => init.mock.calls.length > 0,
    Share: { sendDefault },
  }
  return { sendDefault, init }
}

describe('KakaoTalk sharing', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    delete window.Kakao
  })

  it('stays off without the JavaScript key', async () => {
    vi.stubEnv('VITE_KAKAO_JS_KEY', '')

    expect(canShareToKakao()).toBe(false)
    await expect(
      shareProfileToKakao({
        name: '복작이',
        url: 'https://example.com/share#x',
        origin: 'https://example.com',
      }),
    ).rejects.toThrow()
  })

  it('sends the agreed feed card with the profile link', async () => {
    vi.stubEnv('VITE_KAKAO_JS_KEY', 'test-key')
    const { sendDefault, init } = fakeKakao()

    expect(canShareToKakao()).toBe(true)
    await shareProfileToKakao({
      name: '수연',
      url: 'https://example.com/share#abc',
      origin: 'https://example.com',
    })

    expect(init).toHaveBeenCalledWith('test-key')
    const link = {
      webUrl: 'https://example.com/share#abc',
      mobileWebUrl: 'https://example.com/share#abc',
    }
    expect(sendDefault).toHaveBeenCalledWith({
      objectType: 'feed',
      content: {
        title: '수연님의 룸메이트 프로필',
        description: '함께 살기 전, 나의 생활습관을 확인해 보세요',
        imageUrl: 'https://example.com/share/kakao-profile.png',
        imageWidth: 684,
        imageHeight: 428,
        link,
      },
      buttons: [{ title: '프로필 보기', link }],
    })
  })
})
