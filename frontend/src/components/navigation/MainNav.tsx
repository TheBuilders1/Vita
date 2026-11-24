import type { LucideIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import { NavLink } from 'react-router'
import { cx } from '@/utils/cx'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon | ComponentType<{ className?: string }>
  /** Destaca en el centro de la barra. */
  main?: boolean
}

/** En escritorio va en la barra superior; en móvil, fija abajo, al alcance del pulgar. */
export function MainNav({ items }: { items: readonly NavItem[] }) {
  return (
    <nav aria-label="Principal" className="max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:bg-marino max-md:pb-[env(safe-area-inset-bottom)]">
      {/* Los dos lados suman lo mismo y Vita queda en el centro exacto; «Calendario» necesita más sitio que «Edificio». */}
      <ul className="flex max-md:grid max-md:grid-cols-[minmax(0,4fr)_minmax(0,5.4fr)_minmax(3.5rem,auto)_minmax(0,4.8fr)_minmax(0,4.6fr)] md:gap-1">
        {items.map(({ to, label, icon: Icon, main = false }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) => cx(
                'flex min-h-14 items-center justify-center gap-x-2.5 px-3 font-bold text-crema focus-visible:outline-offset-[-4px] max-md:h-full max-md:flex-col max-md:px-0.5 max-md:py-1.5 max-md:text-center max-md:text-[min(0.875rem,6vw)] max-[24rem]:px-0 max-[24rem]:text-[min(0.78rem,6vw)] max-md:leading-tight max-md:hyphens-auto max-md:[overflow-wrap:anywhere]',
                main ? 'bg-aviso-fondo text-tinta! hover:bg-beige' : !isActive && 'hover:bg-marino-hondo',
                // El contorno claro de las zonas oscuras no se vería sobre estos fondos.
                (main || isActive) && 'focus-visible:outline-tinta!',
                isActive && (main ? 'underline decoration-4 underline-offset-4' : 'bg-crema text-tinta!'),
              )}
            >
              <Icon aria-hidden="true" className={main ? 'size-7 shrink-0' : 'size-5 shrink-0'} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
