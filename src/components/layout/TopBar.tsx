import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MainNav, type NavItem } from '@/components/navigation/MainNav'
import { Logo } from './Logo'

export function TopBar({ familyName, items, children }: { familyName?: string; items: readonly NavItem[]; children?: ReactNode }) {
  return (
    <header className="on-dark flex flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-marino px-4 text-crema sm:px-6">
      <Link to="/" className="flex min-h-14 items-center gap-3 max-md:min-w-0 max-md:grow max-md:basis-0 max-[24rem]:min-w-fit max-[24rem]:basis-auto">
        <Logo className="h-9 shrink-0 max-md:h-6" />
        {familyName && <span className="max-w-[24ch] truncate text-beige max-md:min-w-0 max-[24rem]:hidden">{familyName}</span>}
      </Link>
      <div className="md:order-last">{children}</div>
      <div className="md:ml-auto"><MainNav items={items} /></div>
    </header>
  )
}
