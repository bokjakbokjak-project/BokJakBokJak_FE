import { useEffect, useEffectEvent, useState } from 'react'
import { isApiError } from '../../lib/api/apiError'
import {
  DORMITORY_NAME_MAX_LENGTH,
  canShowDormitoryResults,
  getDormitoryApi,
  isSameName,
  type DormitoryApi,
  type DormitoryOption,
} from '../../lib/onboarding/dormitoryApi'
import SuggestionCombobox, { type SuggestionItem } from './SuggestionCombobox'

type SearchResult = {
  query: string
  options: DormitoryOption[]
  error: 'network' | 'server' | null
}

const NEW_ITEM_KEY = 'new'
export const SEARCH_DEBOUNCE_MS = 200

type DormitoryFieldProps = {
  value: string
  onChange: (value: string) => void
  /**
   * A server dormitory for the typed name: picked from the list, or found by a search for the
   * exact name. Matching does not change the text, so typing is never interrupted.
   */
  onSelect: (dormitory: DormitoryOption) => void
  api?: DormitoryApi
}

/**
 * Searches the user's school dormitories as they type. Choosing ‘새로 추가’ keeps the typed
 * name as a new dormitory; it is registered together with the room type when the onboarding is
 * submitted, because the API registers the two only as a pair.
 */
export default function DormitoryField({
  value,
  onChange,
  onSelect,
  api,
}: DormitoryFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const query = value.trim()
  const canSearch =
    canShowDormitoryResults() &&
    query.length > 0 &&
    query.length <= DORMITORY_NAME_MAX_LENGTH
  // A new callback from the parent must not start another search.
  const reportMatch = useEffectEvent((dormitory: DormitoryOption) =>
    onSelect(dormitory),
  )

  useEffect(() => {
    if (!isOpen || !canSearch) return
    const searchApi = api ?? getDormitoryApi()
    const controller = new AbortController()
    // Cleared on every edit and on unmount, so a late answer never replaces a newer one.
    let isCurrent = true
    const timer = setTimeout(() => {
      searchApi
        .search(query, controller.signal)
        .then((options) => {
          if (!isCurrent) return
          setResult({ query, options, error: null })
          const exact = options.filter(({ name }) => isSameName(name, query))
          if (exact.length === 1) reportMatch(exact[0])
        })
        .catch((error: unknown) => {
          if (!isCurrent) return
          const isNetwork =
            isApiError(error) &&
            (error.kind === 'network' || error.kind === 'timeout')
          setResult({
            query,
            options: [],
            error: isNetwork ? 'network' : 'server',
          })
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      isCurrent = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [api, isOpen, canSearch, query])

  const current = canSearch && result?.query === query ? result : null
  const options = current?.options ?? []
  const hasExactMatch = options.some(({ name }) => isSameName(name, query))
  const hasOtherOptions = options.some(({ name }) => !isSameName(name, query))

  let status: string | null = null
  if (canSearch && !current) status = '검색 중...'
  else if (current?.error === 'network') {
    status = '네트워크 연결을 확인해주세요.'
  } else if (current?.error === 'server') {
    status = '검색 결과를 불러오지 못했습니다.'
  }

  // Nothing to choose when the only result is what is already typed.
  const items: SuggestionItem[] =
    current && !current.error && (!hasExactMatch || hasOtherOptions)
      ? [
          ...options.map((option) => ({ key: option.key, label: option.name })),
          ...(hasExactMatch
            ? []
            : [{ key: NEW_ITEM_KEY, label: `‘${query}’ 새로 추가` }]),
        ]
      : []

  const handleSelect = ({ key }: SuggestionItem) => {
    const option = options.find((item) => item.key === key)
    if (!option) return // ‘새로 추가’: the typed name stays as it is.
    onChange(option.name)
    onSelect(option)
  }

  return (
    <SuggestionCombobox
      id="dormitory"
      label="기숙사"
      placeholder="합격한 기숙사 타입을 입력해주세요."
      value={value}
      onChange={onChange}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      items={items}
      status={status}
      onSelect={handleSelect}
      listLabel="기숙사 검색 결과"
    />
  )
}
