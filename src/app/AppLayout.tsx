import { Building2, CalendarDays, House, Settings, Users } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { TopBar } from '@/components/layout/TopBar'
import type { NavItem } from '@/components/navigation/MainNav'
import { DemoBanner } from '@/features/dashboard/DemoBanner'
import { ProfileSwitcher } from '@/features/family/ProfileSwitcher'
import { navigationStore } from '@/store'
import { Backdrop } from '@/components/backdrop/Backdrop'
import { RecordEditorProvider } from '@/features/records/RecordEditorProvider'
import { HomeContext, useHomeQuery } from './providers/home'

const NAV: readonly NavItem[] = [
  { to: '/', label: 'Edificio', icon: Building2 },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/familia', label: 'Mi familia', icon: Users },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]
/** Menos opciones para el perfil vulnerable; los ajustes siguen al pie de su portada. */
const SIMPLE_NAV: readonly NavItem[] = [
  { to: '/', label: 'Inicio', icon: House },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/edificio', label: 'Mi casa', icon: Building2 },
]

/** Todo lo que necesita una familia creada. */
export function AppLayout() {
  const home = useHomeQuery()
  const { pathname } = useLocation()
  if (home === undefined) return <output className="block p-8">Abriendo tu casa…</output>
  if (home === null) return <Navigate to={navigationStore.getState().entry} replace />
  const simple = home.actor.role === 'vulnerable'
  // El paisaje completo, solo donde está el edificio; con texto encima, suave.
  const outdoors = /^\/(edificio|planta)/.test(pathname) || (pathname === '/' && !simple)
  return (
    <HomeContext value={home}>
      <RecordEditorProvider>
      <Backdrop variant={outdoors ? 'full' : 'soft'} />
      <div className="flex min-h-dvh flex-col">
        <TopBar familyName={home.family.name} items={simple ? SIMPLE_NAV : NAV}>
          <ProfileSwitcher />
        </TopBar>
        {home.family.isDemo && <DemoBanner />}
        <main id="contenido" tabIndex={-1} className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col px-4 py-4 outline-none max-md:pb-28 sm:px-6">
          <Outlet />
        </main>
      </div>
      </RecordEditorProvider>
    </HomeContext>
  )
}
