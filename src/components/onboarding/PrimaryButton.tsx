import type { ButtonHTMLAttributes } from 'react'

/** Figma `Button` component (1041:30705). Disabled keeps the brown fill with gray text. */
export default function PrimaryButton({
  disabled,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex h-[65px] w-full items-center justify-center rounded-[10px] bg-brand-brown1 p-2.5 text-[20px] leading-[1.5] font-semibold ${disabled ? 'text-gray-300' : 'text-white'} ${className}`}
      {...props}
    />
  )
}
