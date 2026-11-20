import { useId, type ReactNode } from 'react'
import sprout from '../../assets/roommate/profile-section-sprout.png'
import {
  ANSWER_GROUPS,
  type AnswerItem,
  type AnswerSummaryCard,
} from '../../lib/answerSummary'
import type { CategoryId } from '../../lib/onboarding/categories'
import { friendlyAnswer } from '../../lib/friendlyAnswers'
import CategoryIcon from '../onboarding/CategoryIcon'

const UNANSWERED = '아직 답하지 않았어요'

type Row = {
  category: CategoryId
  label: string
  /** One entry per topic of the group, in survey order; null when it has no answer. */
  items: { topicId: string; item: AnswerItem | null }[]
}

/**
 * Always the six Figma rows, each with its own topics. A topic the cards do not have (온도 for a
 * survey saved before it existed) shows as unanswered, and a topic no row asks for (the old dishes
 * question in a server profile) is left out instead of reading as another row's answer.
 */
function rowsOf(cards: readonly AnswerSummaryCard[]): Row[] {
  const byTopic = new Map(
    cards.flatMap((card) => card.items.map((item) => [item.topicId, item])),
  )
  return ANSWER_GROUPS.map(({ category, label, topicIds }) => ({
    category,
    label,
    items: topicIds.map((topicId) => ({
      topicId,
      item: byTopic.get(topicId) ?? null,
    })),
  }))
}

function AnswerRow({
  number,
  row,
  side,
}: {
  number: number
  row: Row
  side: 'mine' | 'wanted'
}) {
  return (
    <li
      data-row={row.label}
      className="flex items-center justify-between gap-2 border-t-2 border-dashed border-brand-cream3 px-2 py-2.5 first:border-t-0"
    >
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="w-3.5 text-[18px] leading-[1.5] font-bold tracking-[-0.36px] text-brand-brown3">
          {number}
        </span>
        <span className="flex w-[45px] flex-col items-center gap-0.5">
          <CategoryIcon id={row.category} />
          <span className="text-center text-[14px] leading-[normal] font-semibold whitespace-nowrap text-gray-500">
            {row.label}
          </span>
        </span>
      </div>
      <div className="flex max-w-[202px] min-w-0 flex-col items-end gap-[7px] text-right text-[14px] leading-[1.5] font-medium break-keep">
        {row.items.map(({ topicId, item }) => {
          const raw = item?.[side] ?? null
          const answer =
            raw &&
            friendlyAnswer(topicId, side === 'mine' ? 'self' : 'roommate', raw)
          return (
            <p
              key={topicId}
              className={answer ? 'text-gray-500' : 'text-gray-300'}
            >
              {answer ?? UNANSWERED}
            </p>
          )
        })}
      </div>
    </li>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-[15px]">
      <div className="flex items-center gap-[5px]">
        <img src={sprout} alt="" className="block size-7" />
        <h2
          id={headingId}
          className="text-[20px] leading-[1.5] font-bold tracking-[-0.4px] text-gray-500"
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

const BOX_CLASS =
  'rounded-[12px] border border-brand-cream3 bg-brand-cream2 px-[18px] py-2.5'

/**
 * The detail profile answers (Figma 2339:27404): `전 이런 사람이에요` lists the person's own
 * answers and `이런 분을 원해요` the roommate they want, one numbered row per answer group. A
 * shared link (2339:26489) shows only the first wanted row and blurs the rest under `locked`.
 */
export default function ProfileAnswerSections({
  cards,
  locked,
}: {
  cards: readonly AnswerSummaryCard[]
  /** Shown over the blurred wanted rows after the first one. */
  locked?: ReactNode
}) {
  const rows = rowsOf(cards)
  const row = (item: Row, index: number, side: 'mine' | 'wanted') => (
    <AnswerRow key={item.category} number={index + 1} row={item} side={side} />
  )

  return (
    <div className="flex flex-col gap-[25px]">
      <Section title="전 이런 사람이에요">
        <ol className={BOX_CLASS}>
          {rows.map((item, index) => row(item, index, 'mine'))}
        </ol>
      </Section>
      {/* The 7px strip between the sections spans the whole sheet (2339:27550). */}
      <div aria-hidden className="-mx-6 h-[7px] shrink-0 bg-my-label" />
      <Section title="이런 분을 원해요">
        {locked ? (
          <div className={`relative ${BOX_CLASS}`}>
            <ol>{rows.slice(0, 1).map((item) => row(item, 0, 'wanted'))}</ol>
            <div className="relative">
              <ol
                inert
                aria-hidden
                data-testid="shared-blurred"
                className="border-t-2 border-dashed border-brand-cream3 [&>li:first-child]:border-t-0"
              >
                {rows
                  .slice(1)
                  .map((item, index) => row(item, index + 1, 'wanted'))}
              </ol>
              {/* Figma 2339:26681: white at 10% with a 4px blur over the rows after the first. */}
              <div className="absolute -inset-x-[18px] top-0 -bottom-2.5 rounded-b-[11px] bg-white/10 backdrop-blur-[4px]">
                {locked}
              </div>
            </div>
          </div>
        ) : (
          <ol className={BOX_CLASS}>
            {rows.map((item, index) => row(item, index, 'wanted'))}
          </ol>
        )}
      </Section>
    </div>
  )
}
