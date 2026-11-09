/**
 * Bottom action of the match analysis and the detail profile (Figma 1057:14810, 1377:36887): a
 * 62px button 10px below the top of a cream bar, with 28px under it. The page renders it outside
 * its scroll area, so it stays at the bottom of the screen or the PC frame (designer comment:
 * "하단에 고정"). The chat request API and the chat screen do not exist yet (OPEN_QUESTIONS RM-3),
 * so without `onRequest` it is disabled and does nothing.
 */
export default function ChatRequestBar({
  onRequest,
}: {
  /** Connect the chat request here. Until then the button keeps its look but cannot be used. */
  onRequest?: () => void
}) {
  return (
    <div
      data-testid="chat-request-bar"
      className="relative z-20 shrink-0 bg-brand-cream1 pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto w-full max-w-[390px] px-6">
        <button
          type="button"
          disabled={!onRequest}
          onClick={onRequest}
          className="flex h-[62px] w-full items-center justify-center rounded-[10px] bg-brand-brown1 p-2.5 text-[20px] leading-[1.5] font-semibold text-white"
        >
          대화 요청하기
        </button>
      </div>
    </div>
  )
}
