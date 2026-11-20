import arrowLeft from '../../assets/question/back-arrow-brown.svg'

/**
 * Back button and the `프로필` title shared by the my page frames (1532:20017, 1536:20301). The
 * 체험하기 name screen, built on the nickname frame, passes its own title.
 */
export default function ProfileHeader({
  onBack,
  title = '프로필',
}: {
  onBack: () => void
  title?: string
}) {
  return (
    <header className="relative h-14 shrink-0">
      <button
        type="button"
        aria-label="뒤로"
        className="absolute top-3.5 left-6 flex size-7 items-center justify-center rounded-full border-[1.5px] border-transparent transition-colors hover:border-brand-brown3 hover:bg-brand-beige1 focus-visible:border-brand-brown3 focus-visible:bg-brand-beige1 before:absolute before:-inset-2"
        onClick={onBack}
      >
        <img src={arrowLeft} alt="" className="size-[15.2px] max-w-none" />
      </button>
      <h1 className="pt-[13px] text-center text-[20px] leading-[1.5] font-bold text-brand-brown1">
        {title}
      </h1>
    </header>
  )
}
