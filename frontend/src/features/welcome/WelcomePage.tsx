import { Eye, Flame, Lock, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { useHomeQuery } from '@/app/providers/home'
import { Backdrop } from '@/components/backdrop/Backdrop'
import { Logo } from '@/components/layout/Logo'
import { clearDraft, hasDraft } from '@/features/onboarding/useDraft'
import { RestoreButton } from '@/features/settings/RestoreButton'
import { Button, ButtonLink } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
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
  const [started, setStarted] = useState(hasDraft)
  const [erasing, setErasing] = useState(false)
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
        <Logo className="h-16 max-w-full sm:h-24" />
        <h1 className="mt-5 text-3xl font-bold sm:text-4xl">Tu hogar, al día</h1>
        <p className="mt-4 text-xl">Comidas, colegio, salud, cuentas y planes. Cada cosa en su sitio y todo a mano.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <ButtonLink to="/crear" variant="primary" size="lg" icon={Flame}>{started ? 'Seguir creando mi hogar' : 'Crear mi hogar'}</ButtonLink>
          <Button size="lg" icon={Eye} disabled={busy} onClick={() => { void openDemo() }}>{busy ? 'Preparando…' : 'Ver un hogar de ejemplo'}</Button>
        </div>
        {started && <div className="mt-3"><Button icon={Trash2} onClick={() => setErasing(true)}>Borrar lo escrito</Button></div>}
        <ConfirmDialog open={erasing} title="Borrar lo escrito" confirmLabel="Borrar" onClose={() => setErasing(false)} onConfirm={() => { clearDraft(); setStarted(false); setErasing(false) }}>
          <p>Se borrará lo que habías empezado a escribir de tu hogar. No se puede deshacer.</p>
        </ConfirmDialog>
        <div className="mt-3"><RestoreButton actorId={null} /></div>
        <div role="alert" className="mt-4">{error && <Notice tone="error">{error}</Notice>}</div>
        <section aria-labelledby="privacy" className="mt-6 bg-crema p-5 shadow-panel">
          <h2 id="privacy" className="flex items-center gap-2.5 text-lg font-bold"><Lock aria-hidden="true" className="size-5" />Lo vuestro se queda aquí</h2>
          <p className="mt-2">Vita guarda los datos en este navegador. No hay cuentas y nada se envía fuera si tú no lo pides.</p>
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
