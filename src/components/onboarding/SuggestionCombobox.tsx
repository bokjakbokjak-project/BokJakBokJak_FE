import { useState, type KeyboardEvent } from 'react'
import { Field, TextInput } from './Field'

export type SuggestionItem = {
  key: string
  label: string
  isDisabled?: boolean
}

type SuggestionComboboxProps = {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  /** Rows of the list. The list shows only while it is open and has rows. */
  items: SuggestionItem[]
  /** A line shown in place of the list, such as the pending or failure text. */
  status?: string | null
  onSelect: (item: SuggestionItem) => void
  listLabel: string
}

const ROW_CLASS =
  'flex h-[45px] w-full items-center px-2.5 text-left text-[14px] leading-[1.5] font-medium text-gray-500'

/**
 * Figma defines only the plain input. The suggestion list and its status line are temporary
 * until a final design exists (OPEN_QUESTIONS DE-5). Focus stays on the input while the arrow
 * keys move through the list, following the ARIA combobox pattern.
 */
export default function SuggestionCombobox({
  id,
  label,
  placeholder,
  value,
  onChange,
  isOpen,
  onOpenChange,
  items,
  status,
  onSelect,
  listLabel,
}: SuggestionComboboxProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const listId = `${id}-results`
  const visibleItems = isOpen && !status ? items : []
  const isExpanded = visibleItems.length > 0
  const activeIndex = visibleItems.findIndex(({ key }) => key === activeKey)
  const optionId = (key: string) => `${listId}-${key}`

  const close = () => {
    onOpenChange(false)
    setActiveKey(null)
  }

  const select = (item: SuggestionItem) => {
    if (item.isDisabled) return
    onSelect(item)
    close()
  }

  const moveActive = (step: 1 | -1) => {
    if (!isExpanded) return
    const from = activeIndex === -1 ? (step === 1 ? -1 : 0) : activeIndex
    const count = visibleItems.length
    setActiveKey(visibleItems[(from + step + count) % count].key)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // These keys finish Korean IME composition first, and must not act on the list.
    if (event.nativeEvent.isComposing) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      onOpenChange(true)
      moveActive(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Enter' && activeIndex !== -1) {
      event.preventDefault()
      select(visibleItems[activeIndex])
    } else if (event.key === 'Escape') {
      close()
    }
  }

  return (
    <div className="relative">
      <Field label={label} htmlFor={id}>
        <TextInput
          id={id}
          value={value}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? listId : undefined}
          aria-activedescendant={
            activeIndex !== -1
              ? optionId(visibleItems[activeIndex].key)
              : undefined
          }
          onChange={(next) => {
            onChange(next)
            onOpenChange(true)
            setActiveKey(null)
          }}
          onFocus={() => onOpenChange(true)}
          onBlur={close}
          onKeyDown={handleKeyDown}
        />
      </Field>
      {isOpen && (status || isExpanded) && (
        <div
          className="absolute top-full z-10 w-full overflow-hidden rounded-[8px] border border-[#ebebeb] bg-white"
          onMouseDown={(event) => event.preventDefault()}
        >
          {status ? (
            <p role="status" className={ROW_CLASS}>
              {status}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label={listLabel}>
              {visibleItems.map((item) => (
                <li
                  key={item.key}
                  id={optionId(item.key)}
                  role="option"
                  aria-selected={item.key === activeKey}
                  aria-disabled={item.isDisabled}
                  className={`${ROW_CLASS} ${item.isDisabled ? '' : 'cursor-pointer'} ${item.key === activeKey ? 'bg-gray-100' : ''}`}
                  onClick={() => select(item)}
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
