import { Outlet, ScrollRestoration } from 'react-router'
import { SkipLink } from '@/components/layout/SkipLink'

export function RootLayout() {
  return (
    <>
      <SkipLink />
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
