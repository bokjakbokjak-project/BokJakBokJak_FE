import { errorText } from '../../lib/api/errorText'

/**
 * Loading and failure states for screens that wait on the server. Figma has none, so they use
 * the plain caption style of the existing empty states (chat list, notifications).
 */
export function LoadingState({
  label = '불러오는 중이에요',
  className = '',
}: {
  label?: string
  className?: string
}) {
  return (
    <p
      role="status"
      className={`py-10 text-center text-[14px] leading-[1.5] text-gray-500 ${className}`}
    >
      {label}
    </p>
  )
}

export function ErrorState({
  error,
  onRetry,
  className = '',
}: {
  error: unknown
  /** Left out when trying again cannot help, such as a room the user is not in. */
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 py-10 text-center ${className}`}
    >
      <p className="text-[14px] leading-[1.5] break-keep text-gray-500">
        {errorText(error)}
      </p>
      {onRetry && (
        <button
          type="button"
          className="rounded-full border-2 border-brand-brown3 bg-brand-beige1 px-4 py-1.5 text-[14px] font-semibold text-brand-brown3"
          onClick={onRetry}
        >
          다시 시도
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  return (
    <p
      className={`py-10 text-center text-[14px] leading-[1.5] text-gray-500 ${className}`}
    >
      {text}
    </p>
  )
}
