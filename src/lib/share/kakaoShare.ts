// KakaoTalk sharing with the feed template of Kakao.Share.sendDefault, so no message template has
// to be made in the Kakao console (question OPEN_QUESTIONS PL-6). It needs the app's JavaScript
// key in VITE_KAKAO_JS_KEY and the site domain registered in the console; without the key the
// share button keeps copying the link.

// Kakao JavaScript SDK 2.8.4 (2026-10-19). The integrity value is the SHA-384 of this exact file.
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js'
const SDK_INTEGRITY =
  'sha384-BGX7Wb16GmRFagri4bLJV2DgipVZaU2AI812GZtHtHzzDQJnfHasDXN5houxv45w'

/** Image of the feed card, served from `public/` so Kakao can fetch it by an absolute URL. */
export const KAKAO_SHARE_IMAGE_PATH = '/share/kakao-profile.png'

type KakaoLink = { webUrl: string; mobileWebUrl: string }

type KakaoFeed = {
  objectType: 'feed'
  content: {
    title: string
    description: string
    imageUrl: string
    imageWidth?: number
    imageHeight?: number
    link: KakaoLink
  }
  buttons: { title: string; link: KakaoLink }[]
}

type KakaoSdk = {
  init: (key: string) => void
  isInitialized: () => boolean
  Share: { sendDefault: (settings: KakaoFeed) => void }
}

declare global {
  interface Window {
    Kakao?: KakaoSdk
  }
}

function javascriptKey() {
  const key = import.meta.env.VITE_KAKAO_JS_KEY
  return typeof key === 'string' && key.trim() ? key.trim() : null
}

/** True when the JavaScript key is set for this build. */
export function canShareToKakao() {
  return javascriptKey() !== null
}

let sdkPromise: Promise<KakaoSdk> | null = null

/** Loads the SDK once and initializes it with the JavaScript key. */
function loadKakaoSdk(key: string): Promise<KakaoSdk> {
  if (window.Kakao) {
    if (!window.Kakao.isInitialized()) window.Kakao.init(key)
    return Promise.resolve(window.Kakao)
  }
  sdkPromise ??= new Promise<KakaoSdk>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.integrity = SDK_INTEGRITY
    script.crossOrigin = 'anonymous'
    script.async = true
    script.onload = () => {
      const kakao = window.Kakao
      if (!kakao) {
        reject(new Error('The Kakao SDK did not load.'))
        return
      }
      if (!kakao.isInitialized()) kakao.init(key)
      resolve(kakao)
    }
    script.onerror = () => {
      sdkPromise = null
      script.remove()
      reject(new Error('The Kakao SDK could not be fetched.'))
    }
    document.head.append(script)
  })
  return sdkPromise
}

/**
 * Starts loading the SDK ahead of the tap that shares, so the share window opens straight from
 * that tap and is not taken for a popup. Errors surface when sharing instead.
 */
export function preloadKakaoSdk() {
  const key = javascriptKey()
  if (key) loadKakaoSdk(key).catch(() => {})
}

/**
 * Opens KakaoTalk sharing for a profile link. The card follows the agreed layout: the character
 * image, `{name}님의 룸메이트 프로필`, a short description and a `프로필 보기` button to the link.
 * Rejects when the key is missing or the SDK cannot be used, so the caller can copy the link.
 */
export async function shareProfileToKakao({
  name,
  url,
  origin,
}: {
  name: string
  url: string
  origin: string
}) {
  const key = javascriptKey()
  if (!key) throw new Error('VITE_KAKAO_JS_KEY is not set.')
  const kakao = await loadKakaoSdk(key)
  const link = { webUrl: url, mobileWebUrl: url }
  kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title: `${name}님의 룸메이트 프로필`,
      description: '함께 살기 전, 나의 생활습관을 확인해 보세요',
      imageUrl: `${origin}${KAKAO_SHARE_IMAGE_PATH}`,
      imageWidth: 684,
      imageHeight: 428,
      link,
    },
    buttons: [{ title: '프로필 보기', link }],
  })
}
