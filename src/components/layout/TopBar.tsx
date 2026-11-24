import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MainNav, type NavItem } from '@/components/navigation/MainNav'

export function TopBar({ familyName, items, children }: { familyName?: string; items: readonly NavItem[]; children?: ReactNode }) {
  return (
    <header className="on-dark flex flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-marino px-4 text-crema sm:px-6">
      <Link to="/" className="flex min-h-14 items-center gap-3">
        <span className="font-pixel text-3xl leading-none">Vita</span>
        {familyName && <span className="max-w-[14ch] truncate text-beige sm:max-w-[24ch]">{familyName}</span>}
      </Link>
      <div className="md:order-last">{children}</div>
      <div className="md:ml-auto"><MainNav items={items} /></div>
    </header>
  )
}
