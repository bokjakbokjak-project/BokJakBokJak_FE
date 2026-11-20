import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useModalLayer } from '../../lib/onboarding/useModalLayer'
import {
  COMMENT_MAX_LENGTH,
  FEEDBACK_HEADING,
  getFeedbackQuestion,
} from '../../lib/userTest/feedbackQuestions'
import type { FeedbackRecord } from '../../lib/userTest/userTestStore'

/**
 * One feedback question as a bottom sheet in the existing dialog style (cream panel, brown
 * buttons, 0.75 dimmed layer). Nothing is selected at first, every option looks the same, the
 * answer button waits for a choice, and `건너뛰기`, Escape or a tap outside skip it. The comment is
 * optional and opens after a choice.
 */
export default function FeedbackSheet({
  record,
  onAnswer,
  onSkip,
}: {
  record: FeedbackRecord
  onAnswer: (optionId: string, comment: string | null) => void
  onSkip: () => void
}) {
  const question = getFeedbackQuestion(record.questionId, record.dataSource)
  const [optionId, setOptionId] = useState<string | null>(null)
  const [isCommentOpen, setIsCommentOpen] = useState(false)
  const [comment, setComment] = useState('')
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // Focus goes back to whatever had it before the sheet opened.
  const triggerRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )
  const titleId = useId()
  const commentId = useId()

  useModalLayer({ overlayRef, contentRef, triggerRef })

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-40 flex justify-center md:items-center"
      onClick={onSkip}
    >
      <div className="flex h-full w-full flex-col justify-end bg-[rgba(18,18,18,0.75)] md:h-[844px] md:w-[390px] md:overflow-hidden md:rounded-[24px] md:[zoom:var(--frame-scale,1)]">
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="scrollbar-none flex max-h-[90%] flex-col gap-4 overflow-y-auto rounded-t-[24px] border-2 border-b-0 border-brand-brown3 bg-brand-cream1 px-6 pt-6 pb-[max(24px,env(safe-area-inset-bottom))] outline-none"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onSkip()
          }}
        >
          <div className="flex flex-col gap-1 leading-[1.5]">
            <p className="text-[13px] font-semibold text-brand-brown3">
              {FEEDBACK_HEADING}
            </p>
            <h2
              id={titleId}
              className="text-[17px] font-bold tracking-[-0.34px] break-keep text-brand-brown1"
            >
              {question.title}
            </h2>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{question.title}</legend>
            {question.options.map((option) => {
              const isSelected = option.id === optionId
              return (
                <label
                  key={option.id}
                  className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] border-[1.5px] bg-white px-3.5 py-2.5 text-[14px] leading-[1.5] font-medium break-keep text-gray-black has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-brown2 ${isSelected ? 'border-brand-brown3' : 'border-brand-cream3'}`}
                >
                  <input
                    type="radio"
                    name={`feedback-${record.questionId}`}
                    value={option.id}
                    checked={isSelected}
                    className="size-4 shrink-0 accent-[var(--color-brand-brown1)]"
                    onChange={() => setOptionId(option.id)}
                  />
                  {option.label}
                </label>
              )
            })}
          </fieldset>
          {optionId !== null &&
            (isCommentOpen ? (
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={commentId}
                  className="text-[13px] leading-[1.5] font-medium break-keep text-gray-500"
                >
                  {question.commentPrompt}
                </label>
                <textarea
                  id={commentId}
                  rows={3}
                  maxLength={COMMENT_MAX_LENGTH}
                  value={comment}
                  className="resize-none rounded-[10px] border border-brand-cream3 bg-white px-3 py-2 text-[16px] leading-[1.5] text-gray-black outline-none focus-visible:border-brand-brown2"
                  onChange={(event) => setComment(event.target.value)}
                  onFocus={(event) =>
                    // Keeps the field above the phone keyboard.
                    event.currentTarget.scrollIntoView({ block: 'center' })
                  }
                />
                <p className="text-right text-[12px] text-gray-300">
                  {comment.length}/{COMMENT_MAX_LENGTH}
                </p>
              </div>
            ) : (
              <button
                type="button"
                aria-expanded={false}
                className="self-start text-[13px] leading-[1.5] font-semibold text-brand-brown3 underline"
                onClick={() => setIsCommentOpen(true)}
              >
                한마디 남기기 · 선택
              </button>
            ))}
          <div className="flex gap-1.5">
            <button
              type="button"
              className="flex h-[46px] w-[110px] shrink-0 items-center justify-center rounded-full border border-brand-cream3 bg-brand-cream2 text-[16px] font-semibold text-brand-brown1"
              onClick={onSkip}
            >
              건너뛰기
            </button>
            <button
              type="button"
              disabled={optionId === null}
              className="flex h-[46px] flex-1 items-center justify-center rounded-full bg-brand-brown1 text-[16px] font-semibold text-white disabled:opacity-40"
              onClick={() => {
                if (optionId !== null) onAnswer(optionId, comment || null)
              }}
            >
              답변하고 계속하기
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
