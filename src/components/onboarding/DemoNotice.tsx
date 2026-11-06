/**
 * Shown on demo links only, so it is not part of the Figma design. It sits in the empty status
 * bar area above every screen, and ignores pointer events so it never blocks a tap.
 */
export default function DemoNotice() {
  return (
    <p
      role="note"
      className="pointer-events-none fixed inset-x-0 top-0 z-30 bg-brand-beige1 px-3 pt-[calc(env(safe-area-inset-top)+2px)] pb-0.5 text-center text-[11px] break-keep leading-[1.5] font-medium text-brand-brown1"
    >
      시연용 화면입니다. 실제 개인정보 대신 테스트 데이터를 입력해주세요.
      입력값은 저장되지 않습니다.
    </p>
  )
}
