import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { canUseTemporaryFlow } from '../../lib/onboarding/demoMode'
import {
  dormitoryApi,
  type DormitoryApi,
  type DormitoryOption,
} from '../../lib/onboarding/dormitoryApi'
import { Field, TextInput } from './Field'

type SearchResult = {
  query: string
  options: DormitoryOption[]
  failed: boolean
}

type CreateState =
  { status: 'idle' } | { status: 'pending' | 'failed'; query: string }

type ListItem = {
  key: string
  label: string
  isDisabled?: boolean
}

const LISTBOX_ID = 'dormitory-results'
const NEW_ITEM_KEY = 'new'

const ROW_CLASS =
  'flex h-[45px] w-full items-center px-2.5 text-left text-[14px] leading-[1.5] font-medium text-gray-500'

type DormitoryFieldProps = {
  value: string
  onChange: (value: string) => void
  api?: DormitoryApi
}

/**
 * Figma defines only the plain input. The suggestion list, its pending text, and the failure
 * text are temporary until a final design exists (OPEN_QUESTIONS DE-5). Focus stays on the
 * input while the arrow keys move through the list, following the ARIA combobox pattern.
 */
export default function DormitoryField({
  value,
  onChange,
  api = dormitoryApi,
}: DormitoryFieldProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [createState, setCreateState] = useState<CreateState>({
    status: 'idle',
  })
  // The state updates too late to stop a second click in the same frame.
  const isCreatingRef = useRef(false)
  // Changes when the input is edited or unmounted, so a late response cannot overwrite it.
  const inputVersionRef = useRef(0)
  const query = value.trim()

  useEffect(() => {
    if (!isOpen || !query) return
    let isCurrent = true
    const timer = setTimeout(() => {
      api
        .search(query)
        .then((options) => {
          if (isCurrent) setResult({ query, options, failed: false })
        })
        .catch(() => {
          if (isCurrent) setResult({ query, options: [], failed: true })
        })
    }, 200)
    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [api, isOpen, query])

  useEffect(
    () => () => {
      inputVersionRef.current += 1
    },
    [],
  )

  const close = () => {
    setIsOpen(false)
    setActiveKey(null)
  }

  const choose = (name: string) => {
    inputVersionRef.current += 1
    onChange(name)
    close()
  }

  const addNew = async () => {
    if (isCreatingRef.current) return
    isCreatingRef.current = true
    const version = inputVersionRef.current
    setCreateState({ status: 'pending', query })
    try {
      const created = await api.create(query)
      setCreateState({ status: 'idle' })
      if (version === inputVersionRef.current) choose(created.name)
    } catch {
      setCreateState({ status: 'failed', query })
    } finally {
      isCreatingRef.current = false
    }
  }

  const current = result?.query === query ? result : null
  const hasExactMatch = current?.options.some(({ name }) => name === query)
  const hasOtherOptions = current?.options.some(({ name }) => name !== query)
  // Without a server, nothing comes back and only the Figma input is shown.
  const visibleResult =
    isOpen &&
    query &&
    current &&
    (!hasExactMatch || hasOtherOptions) &&
    (current.failed || canUseTemporaryFlow())
      ? current
      : null

  const isCreatePending = createState.status === 'pending'
  const items: ListItem[] =
    visibleResult && !visibleResult.failed
      ? [
          ...visibleResult.options.map((option) => ({
            key: option.id,
            label: option.name,
          })),
          ...(hasExactMatch
            ? []
            : [
                {
                  key: NEW_ITEM_KEY,
                  label: isCreatePending
                    ? `‘${query}’ 추가 중...`
                    : `‘${query}’ 새로 추가`,
                  isDisabled: isCreatePending,
                },
              ]),
        ]
      : []
  const isExpanded = items.length > 0
  const activeIndex = items.findIndex(({ key }) => key === activeKey)
  const optionId = (key: string) => `${LISTBOX_ID}-${key}`

  const selectItem = ({ key, label }: ListItem) => {
    if (key === NEW_ITEM_KEY) void addNew()
    else choose(label)
  }

  const moveActive = (step: 1 | -1) => {
    if (!isExpanded) return
    const from = activeIndex === -1 ? (step === 1 ? -1 : 0) : activeIndex
    setActiveKey(items[(from + step + items.length) % items.length].key)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // These keys finish Korean IME composition first, and must not act on the list.
    if (event.nativeEvent.isComposing) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      moveActive(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter' && activeIndex !== -1) {
      event.preventDefault()
      selectItem(items[activeIndex])
    } else if (event.key === 'Escape') {
      close()
    }
  }

  return (
    <div className="relative">
      <Field label="기숙사" htmlFor="dormitory">
        <TextInput
          id="dormitory"
          value={value}
          placeholder="합격한 기숙사 타입을 입력해주세요."
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? LISTBOX_ID : undefined}
          aria-activedescendant={
            activeIndex !== -1 ? optionId(items[activeIndex].key) : undefined
          }
          onChange={(next) => {
            inputVersionRef.current += 1
            onChange(next)
            setIsOpen(true)
            setActiveKey(null)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={close}
          onKeyDown={handleKeyDown}
        />
      </Field>
      {createState.status === 'failed' && createState.query === query && (
        <p
          role="alert"
          className="mt-[5px] text-[13px] leading-[1.5] text-gray-500"
        >
          기숙사를 추가하지 못했습니다. 다시 시도해주세요.
        </p>
      )}
      {visibleResult && (
        <div
          className="absolute top-full z-10 w-full overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white"
          onMouseDown={(event) => event.preventDefault()}
        >
          {visibleResult.failed ? (
            <p role="status" className={ROW_CLASS}>
              검색 결과를 불러오지 못했습니다.
            </p>
          ) : (
            <ul id={LISTBOX_ID} role="listbox" aria-label="기숙사 검색 결과">
              {items.map((item) => (
                <li
                  key={item.key}
                  id={optionId(item.key)}
                  role="option"
                  aria-selected={item.key === activeKey}
                  aria-disabled={item.isDisabled}
                  className={`${ROW_CLASS} ${item.isDisabled ? '' : 'cursor-pointer'} ${item.key === activeKey ? 'bg-gray-100' : ''}`}
                  onClick={() => selectItem(item)}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
