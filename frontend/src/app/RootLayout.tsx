import { Outlet, ScrollRestoration } from 'react-router'
import { RouteAnnouncer } from '@/components/layout/RouteAnnouncer'
import { SkipLink } from '@/components/layout/SkipLink'
import { useFocusGuard } from '@/hooks/useFocusGuard'

export function RootLayout() {
  useFocusGuard()
  return (
    <>
      <SkipLink />
      <Outlet />
      {/* Al entrar por una dirección todas las pantallas comparten clave: una aparecería desplazada como la otra. */}
      <ScrollRestoration getKey={({ key, pathname }) => (key === 'default' ? pathname : key)} />
      <RouteAnnouncer />
    </>
  )
}
