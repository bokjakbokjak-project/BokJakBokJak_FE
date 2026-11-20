const KEY = 'bokjak-share-return'

export function rememberShareReturn(hash: string) {
  try {
    sessionStorage.setItem(KEY, `/share${hash}`)
  } catch {
    /* Storage may be unavailable. */
  }
}

export function takeShareReturn(): string | null {
  try {
    const value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return value?.startsWith('/share#') ? value : null
  } catch {
    return null
  }
}
