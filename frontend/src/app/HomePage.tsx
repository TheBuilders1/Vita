import { lazy, Suspense } from 'react'
import { useLocation } from 'react-router'
import { useHome } from './providers/home'

const BuildingPage = lazy(async () => ({ default: (await import('@/features/building/BuildingPage')).BuildingPage }))
const SimpleHome = lazy(async () => ({ default: (await import('@/features/dashboard/SimpleHome')).SimpleHome }))

/** El perfil vulnerable entra por su portada; para los demás, la portada es el edificio. */
export function HomePage() {
  const { actor } = useHome()
  const { pathname } = useLocation()
  const simple = actor.role === 'vulnerable' && pathname === '/'
  return <Suspense fallback={<output>Abriendo…</output>}>{simple ? <SimpleHome /> : <BuildingPage />}</Suspense>
}
