import type { InputHTMLAttributes, ReactNode } from 'react'

type FieldProps = {
  label: string
  htmlFor?: string
  labelClassName?: string
  children: ReactNode
}

export function Field({
  label,
  htmlFor,
  labelClassName = 'text-gray-black',
  children,
}: FieldProps) {
  const labelClass = `text-[18px] leading-[1.5] font-medium ${labelClassName}`
  return (
    <div className="flex flex-col gap-[5px]">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={labelClass}>
          {label}
        </label>
      ) : (
        <p className={labelClass}>{label}</p>
      )}
      {children}
    </div>
  )
}

export const FIELD_BOX_CLASS =
  'w-full rounded-[8px] border border-gray-100 bg-white px-2.5 text-[14px] leading-[1.5] font-medium'

type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className' | 'onChange' | 'type' | 'value'
> & {
  id: string
  value: string
  placeholder: string
  heightClassName?: string
  onChange: (value: string) => void
}

export function TextInput({
  value,
  heightClassName = 'h-[45px] pt-[9px] pb-[11px]',
  onChange,
  ...inputProps
}: TextInputProps) {
  return (
    <input
      {...inputProps}
      type="text"
      value={value}
      autoComplete="off"
      className={`${FIELD_BOX_CLASS} ${heightClassName} text-gray-black placeholder:text-gray-300`}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
