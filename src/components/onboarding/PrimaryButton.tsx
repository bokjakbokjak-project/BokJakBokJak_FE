import type { ButtonHTMLAttributes } from 'react'

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Corner radius class. Figma uses 20px except on the school step (100px). */
  radiusClassName?: string
}

export default function PrimaryButton({
  radiusClassName = 'rounded-[20px]',
  disabled,
  className = '',
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex h-[65px] w-full items-center justify-center p-2.5 text-[20px] leading-[1.5] font-semibold text-white ${radiusClassName} ${disabled ? 'bg-gray-300' : 'bg-brand-brown1'} ${className}`}
      {...props}
    />
  )
}
