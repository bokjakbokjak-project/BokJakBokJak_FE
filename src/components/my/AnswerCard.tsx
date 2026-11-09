import { useId, useState } from 'react'
import categoryIcons from '../../assets/onboarding/category-icons.png'
import pageLeft from '../../assets/my/page-left.svg'
import pageRight from '../../assets/my/page-right.svg'
import type { AnswerSummaryCard } from '../../lib/my/answerSummary'
import { CATEGORY_LABELS } from '../../lib/onboarding/categories'

const UNANSWERED = '아직 답하지 않았어요'

function AnswerRow({
  label,
  value,
  labelClass,
}: {
  label: string
  value: string | null
  labelClass: string
}) {
  return (
    <div className="flex items-center gap-2">
      <dt
        className={`w-[75px] shrink-0 rounded-[5px] border px-3 py-2 text-center text-[12px] leading-[normal] font-semibold whitespace-nowrap ${labelClass}`}
      >
        {label}
      </dt>
      <dd
        className={`min-w-0 flex-1 py-2 text-right text-[14px] leading-[normal] font-medium break-keep ${value ? 'text-gray-500' : 'text-gray-300'}`}
      >
        {value ?? UNANSWERED}
      </dd>
    </div>
  )
}

/** One category of the `상세 답변 요약` panel (Figma 1532:20058 and 1532:20077). */
export default function AnswerCard({
  card: { category, title, items },
}: {
  card: AnswerSummaryCard
}) {
  const [page, setPage] = useState(0)
  const titleId = useId()
  const item = items[page]
  const hasPages = items.length > 1

  return (
    <section
      aria-labelledby={titleId}
      className="rounded-[12px] border border-brand-cream3 bg-white px-[27px] py-5"
    >
      <div className="flex flex-col gap-[9px] border-b border-brand-cream4 pb-2.5">
        <div className="flex items-center gap-[3px]">
          <span className="relative block size-[37px] shrink-0 overflow-hidden">
            <img
              src={categoryIcons}
              alt=""
              className="absolute top-[-30.29%] h-[159.09%] w-[477.27%] max-w-none"
              style={{ left: `${CATEGORY_LABELS[category].iconLeft}%` }}
            />
          </span>
          <h3
            id={titleId}
            className="text-[18px] leading-[1.5] font-semibold text-brand-brown3"
          >
            {title}
          </h3>
        </div>
        <p className="text-[16px] leading-[1.5] font-semibold whitespace-pre-line text-gray-500">
          {item.question}
        </p>
      </div>
      <dl className="mt-[25px] flex flex-col gap-[7px]">
        <AnswerRow
          label="나의 성향"
          value={item.mine}
          labelClass="border-brand-cream3 bg-my-label text-brand-brown1"
        />
        <AnswerRow
          label="원하는 성향"
          value={item.wanted}
          labelClass="border-brand-brown3 bg-brand-brown3 text-white"
        />
      </dl>
      {hasPages && (
        <div className="mt-[15px] flex items-center justify-center gap-2">
          <button
            type="button"
            aria-label={`${title} 이전 질문`}
            disabled={page === 0}
            className="size-6 disabled:opacity-30"
            onClick={() => setPage(page - 1)}
          >
            <img src={pageLeft} alt="" className="size-6" />
          </button>
          <p
            aria-live="polite"
            aria-label={`${items.length}개 중 ${page + 1}번째 질문`}
            className="text-[16px] leading-[1.5] font-semibold tracking-[0.32px] text-brand-brown3"
          >
            {page + 1}/{items.length}
          </p>
          <button
            type="button"
            aria-label={`${title} 다음 질문`}
            disabled={page === items.length - 1}
            className="size-6 disabled:opacity-30"
            onClick={() => setPage(page + 1)}
          >
            <img src={pageRight} alt="" className="size-6" />
          </button>
        </div>
      )}
    </section>
  )
}
