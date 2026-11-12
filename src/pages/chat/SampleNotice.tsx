/**
 * Marks the Production sample rooms (chat OPEN_QUESTIONS CH-1). Not in Figma; it uses the
 * common colors so it reads as a notice, not as part of the chat.
 */
export default function SampleNotice({
  className = '',
}: {
  className?: string
}) {
  return (
    <p
      role="note"
      className={`rounded-[10px] bg-white/80 px-3 py-2 text-center text-[12px] leading-[1.5] font-medium text-gray-500 ${className}`}
    >
      예시 채팅방이에요. 실제 대화가 아니에요.
    </p>
  )
}
