import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-[2em] font-bold text-gray-black">
        페이지를 찾을 수 없습니다
      </h1>
      <Link className="text-brand-brown1 underline" to="/">
        처음으로 돌아가기
      </Link>
    </main>
  )
}
