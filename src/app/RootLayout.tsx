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
      <ScrollRestoration />
      <RouteAnnouncer />
    </>
  )
}
