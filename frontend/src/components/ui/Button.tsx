import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { cx } from '@/utils/cx'

type Variant = 'primary' | 'confirm' | 'secondary' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-marino text-crema [--edge:var(--color-marino-hondo)] hover:bg-marino-hondo',
  confirm: 'bg-oliva text-crema [--edge:var(--color-oliva-honda)] hover:bg-oliva-honda',
  secondary: 'bg-crema text-tinta hover:bg-beige',
  danger: 'bg-peligro text-crema [--edge:var(--color-peligro-hondo)] hover:bg-peligro-hondo',
}
const SIZES: Record<Size, string> = {
  sm: 'min-h-11 px-3 py-1 gap-1.5',
  md: 'min-h-12 px-5 py-2 gap-2.5',
  lg: 'min-h-16 px-7 py-3 gap-3 text-lg',
}
const BASE = 'pixel-edge inline-flex items-center justify-center text-center font-bold leading-tight active:translate-y-0.5 disabled:opacity-60 disabled:active:translate-y-0'

interface Look { variant?: Variant; size?: Size; icon?: LucideIcon; children: ReactNode }

const look = ({ variant = 'secondary', size = 'md' }: Pick<Look, 'variant' | 'size'>, className?: string) =>
  cx(BASE, VARIANTS[variant], SIZES[size], className)

/** Siempre lleva texto: un icono solo no se entiende igual de bien. */
export function Button({ variant, size, icon: Icon, children, className, type = 'button', ...props }: Look & ComponentProps<'button'>) {
  return (
    <button type={type} className={look({ variant, size }, className)} {...props}>
      {Icon && <Icon aria-hidden="true" className="size-5 shrink-0" />}
      <span>{children}</span>
    </button>
  )
}

export function ButtonLink({ variant, size, icon: Icon, children, className, ...props }: Look & LinkProps) {
  return (
    <Link className={look({ variant, size }, className)} {...props}>
      {Icon && <Icon aria-hidden="true" className="size-5 shrink-0" />}
      <span>{children}</span>
    </Link>
  )
}
