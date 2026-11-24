import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { cx } from '@/utils/cx'

export interface NavItem { to: string; label: string; icon: LucideIcon }

/** En escritorio va en la barra superior; en móvil, fija abajo, al alcance del pulgar. */
export function MainNav({ items }: { items: readonly NavItem[] }) {
  return (
    <nav aria-label="Principal" className="max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:bg-marino max-md:pb-[env(safe-area-inset-bottom)]">
      <ul className="flex max-md:justify-around md:gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="max-md:flex-1">
            <NavLink
              to={to}
              end
              className={({ isActive }) => cx(
                'flex min-h-14 items-center justify-center gap-x-2.5 px-3 font-bold text-crema focus-visible:outline-offset-[-4px] max-md:flex-col max-md:px-1 max-md:py-1.5 max-md:text-[min(0.875rem,5vw)] max-md:leading-tight',
                isActive ? 'bg-crema text-tinta!' : 'hover:bg-marino-hondo',
              )}
            >
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
