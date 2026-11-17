import { useLayoutEffect, useRef, type FormEvent } from 'react'
import sendIcon from '../../assets/chat/send-round.svg'

/** One line is 42px: 24px of text, 8px of padding above and below, and the 1px border. */
const MIN_HEIGHT = 42
/** Five lines, then the text scrolls inside the field (KakaoTalk-like, requested 2026-11-17). */
const MAX_HEIGHT = 24 * 5 + 18

/**
 * The message field of the chat rooms. It wraps a long message instead of running on in one
 * line, and grows with it up to five lines. Enter sends and Shift+Enter starts a new line;
 * Enter that finishes Korean input (IME composition) does not send.
 */
export default function ChatInput({
  value,
  disabled,
  canSend,
  maxLength,
  onChange,
  onSubmit,
}: {
  value: string
  disabled: boolean
  canSend: boolean
  maxLength?: number
  onChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const fieldRef = useRef<HTMLTextAreaElement>(null)

  // The height follows the text, also when it is cleared after sending.
  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.style.height = 'auto'
    const height = Math.min(
      Math.max(field.scrollHeight + 2, MIN_HEIGHT),
      MAX_HEIGHT,
    )
    field.style.height = `${height}px`
    field.style.overflowY =
      field.scrollHeight + 2 > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [value])

  return (
    <form ref={formRef} className="relative" onSubmit={onSubmit}>
      <textarea
        ref={fieldRef}
        rows={1}
        aria-label="메시지 입력"
        placeholder="메세지 입력"
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        className="scrollbar-none block h-[42px] w-full resize-none overflow-hidden rounded-[20px] border border-gray-100 bg-white py-2 pr-12 pl-3 text-[16px] leading-[1.5] break-keep [overflow-wrap:anywhere] text-gray-black outline-none placeholder:text-gray-500 focus-visible:border-brand-brown2 disabled:opacity-60"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault()
            if (canSend) formRef.current?.requestSubmit()
          }
        }}
      />
      {/* Stays on the last line as the field grows. */}
      <button
        type="submit"
        aria-label="메시지 보내기"
        disabled={!canSend}
        className="absolute right-3 bottom-[7px] size-7 disabled:opacity-40"
      >
        <img src={sendIcon} alt="" />
      </button>
    </form>
  )
}
