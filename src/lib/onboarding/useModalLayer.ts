import { useEffect, type RefObject } from 'react'

type ModalLayerRefs = {
  overlayRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLElement | null>
  /** Receives focus again when the layer closes. */
  triggerRef: RefObject<HTMLElement | null>
}

/**
 * For a layer portaled to the body. Everything else becomes inert, which removes the background
 * from keyboard, pointer, and screen reader use while the layer is open.
 */
export function useModalLayer({
  overlayRef,
  contentRef,
  triggerRef,
}: ModalLayerRefs) {
  useEffect(() => {
    const trigger = triggerRef.current
    const background = [...document.body.children].filter(
      (element) => element !== overlayRef.current,
    )
    background.forEach((element) => element.setAttribute('inert', ''))
    contentRef.current?.focus()
    return () => {
      background.forEach((element) => element.removeAttribute('inert'))
      trigger?.focus()
    }
  }, [overlayRef, contentRef, triggerRef])
}
