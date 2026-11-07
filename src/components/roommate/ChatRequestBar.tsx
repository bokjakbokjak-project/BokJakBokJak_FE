type ChatRequestBarProps = {
  /** The Figma frames differ: 62px on the analysis, and 54px with a shadow on the detail. */
  variant: 'analysis' | 'detail'
  /** Connect the chat request here. Until then the button keeps its look but cannot be used. */
  onRequest?: () => void
}

const VARIANTS = {
  analysis: {
    bar: 'pt-2.5 pb-[max(28px,env(safe-area-inset-bottom))]',
    button: 'h-[62px] text-white',
  },
  detail: {
    bar: 'pt-4 pb-[max(24px,env(safe-area-inset-bottom))] shadow-[0_-1px_30px_0_rgba(212,212,212,0.25)]',
    button: 'h-[54px] text-question-paper',
  },
}

/**
 * Bottom action from Figma (1057:14810, 1057:11979). The chat request API and the chat screen do
 * not exist yet (OPEN_QUESTIONS RM-3), so without `onRequest` it is disabled and does nothing.
 */
export default function ChatRequestBar({
  variant,
  onRequest,
}: ChatRequestBarProps) {
  const style = VARIANTS[variant]
  return (
    <div
      className={`sticky bottom-0 z-20 mt-auto shrink-0 bg-brand-cream1 ${style.bar}`}
    >
      <div className="mx-auto w-full max-w-[390px] px-6">
        <button
          type="button"
          disabled={!onRequest}
          onClick={onRequest}
          className={`flex w-full items-center justify-center rounded-[10px] bg-brand-brown1 p-2.5 text-[20px] leading-[1.5] font-semibold ${style.button}`}
        >
          대화 요청하기
        </button>
      </div>
    </div>
  )
}
