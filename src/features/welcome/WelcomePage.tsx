import { KeyRound, Lock, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { useHomeQuery } from '@/app/providers/home'
import { Backdrop } from '@/components/backdrop/Backdrop'
import { RestoreButton } from '@/features/settings/RestoreButton'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Notice'
import { loadDemo } from '@/data/demo'
import { db, repositories } from '@/database'
import { useTitle } from '@/hooks/useTitle'
import { MODULES } from '@/modules/registry'
import { describeError } from '@/services/errors'
import { BuildingView } from '@/three/scene/BuildingView'
import { todayIso } from '@/utils/dates'

const ROOMS = MODULES.filter((m) => m.floor !== null).map((m) => ({ moduleId: m.id, pending: 0, enabled: true }))
const ignore = () => {}

export function WelcomePage() {
  const home = useHomeQuery()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  useTitle('Bienvenida')
  if (home) return <Navigate to="/" replace />

  const openDemo = async () => {
    setBusy(true)
    try {
      await loadDemo(db, repositories, todayIso())
    } catch (cause) {
      setError(describeError(cause))
      setBusy(false)
    }
  }
  return (
    <>
    <Backdrop variant="full" quiet={0.42} />
    <main id="contenido" tabIndex={-1} className="mx-auto grid min-h-dvh max-w-[100rem] grid-cols-1 items-center gap-8 px-5 py-8 outline-none lg:grid-cols-[minmax(0,30rem)_minmax(0,1fr)] lg:px-10">
      <div>
        <p className="font-pixel text-6xl leading-none sm:text-7xl">Vita</p>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">La casa donde cabe toda la organización de tu familia</h1>
        <p className="mt-4 text-xl">Comidas, colegio, salud, cuentas y planes. Cada cosa en su habitación y todo a mano.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink to="/crear" variant="primary" size="lg" icon={KeyRound}>Crear mi familia</ButtonLink>
          <Button size="lg" icon={UsersRound} disabled={busy} onClick={() => { void openDemo() }}>{busy ? 'Preparando…' : 'Ver una familia de ejemplo'}</Button>
        </div>
        <div className="mt-3"><RestoreButton actorId={null} /></div>
        <div role="alert" className="mt-4">{error && <Notice tone="error">{error}</Notice>}</div>
        <section aria-labelledby="privacy" className="mt-6 bg-crema p-5 shadow-panel">
          <h2 id="privacy" className="flex items-center gap-2.5 text-lg font-bold"><Lock aria-hidden="true" className="size-5" />Lo vuestro se queda aquí</h2>
          <p className="mt-2">Vita guarda los datos en este navegador. No hay cuentas ni servidores, y nada se envía fuera.</p>
          <p className="mt-2">No es una caja fuerte: los datos no van cifrados y se pierden si borras el almacenamiento del navegador o cambias de dispositivo.</p>
        </section>
      </div>
      <div className="h-[36dvh] max-lg:order-first lg:h-[92dvh]">
        <BuildingView decorative rooms={ROOMS} floorId={null} moduleId={null} hovered={null} onHover={ignore} onSelectFloor={ignore} onSelectModule={ignore} />
      </div>
    </main>
    </>
  )
}
