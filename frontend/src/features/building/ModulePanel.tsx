import { Suspense, useEffect, useRef } from 'react'
import { useHome } from '@/app/providers/home'
import { BackLink } from '@/components/navigation/BackLink'
import { ButtonLink } from '@/components/ui/Button'
import { ModuleIcon } from '@/components/ui/ModuleIcon'
import { Disclaimer, Notice } from '@/components/ui/Notice'
import { AgendaRow } from '@/features/calendar/AgendaRow'
import { GuideList } from '@/features/modules/GuideList'
import { ModuleRecords } from '@/features/modules/shared'
import { MODULE_VIEWS } from '@/features/modules/views'
import { TipCard } from '@/features/tips/TipCard'
import { useAttention } from '@/hooks/useAttention'
import { useTips } from '@/hooks/useTips'
import type { Floor } from '@/modules/floors'
import type { ModuleDef } from '@/modules/types'
import { accessTo, canManage } from '@/services/permissions'
import { revealIfHiddenBelow } from '@/utils/reveal'

export function ModulePanel({ module, floor, enabled }: { module: ModuleDef; floor: Floor; enabled: boolean }) {
  const heading = useRef<HTMLHeadingElement>(null)
  // Al entrar en una habitación, el foco y el lector de pantalla van a su nombre.
  useEffect(() => {
    if (!heading.current) return
    heading.current.focus({ preventScroll: true })
    revealIfHiddenBelow(heading.current)
  }, [module.id])
  return (
    <section aria-labelledby="module-title" className="bg-crema p-4 shadow-panel sm:p-6">
      <BackLink to={`/planta/${floor.id}`}>{`Volver a ${floor.name}`}</BackLink>
      <div className="mt-2 flex items-center gap-3">
        <ModuleIcon id={module.id} className="size-8" />
        <h2 ref={heading} id="module-title" tabIndex={-1} className="text-2xl font-bold outline-none">{module.name}</h2>
      </div>
      <p className="mt-1">{module.description}</p>
      {enabled ? <Content key={module.id} module={module} /> : <Closed module={module} />}
    </section>
  )
}

const MAX_PENDING = 4
const MAX_TIPS = 2
/** Su vista ya enseña lo pendiente. */
const OWN_PENDING = new Set(['medication', 'documents'])

function Content({ module }: { module: ModuleDef }) {
  const attention = useAttention().filter((a) => a.item.moduleId === module.id && a.when !== 'soon')
  const tips = useTips().filter((t) => t.moduleId === module.id).slice(0, MAX_TIPS)
  const View = MODULE_VIEWS[module.id]
  return (
    <div className="mt-5 grid grid-cols-1 gap-6">
      {tips.length > 0 && <ul aria-label="Consejos" className="grid grid-cols-1 gap-2">{tips.map((t) => <TipCard key={t.id} tip={t} linked={false} />)}</ul>}
      {attention.length > 0 && !OWN_PENDING.has(module.id) && (
        <div>
          <h3 className="mb-2 text-lg font-bold">Pendiente</h3>
          <ul className="grid grid-cols-1 gap-2">{attention.slice(0, MAX_PENDING).map(({ id, item }) => <AgendaRow key={id} item={item} showDate />)}</ul>
        </div>
      )}
      <Suspense fallback={<output>Abriendo…</output>}>{View ? <View /> : <ModuleRecords moduleId={module.id} />}</Suspense>
      <GuideList moduleId={module.id} />
      {module.disclaimer && <Disclaimer kind={module.disclaimer} />}
    </div>
  )
}

function Closed({ module }: { module: ModuleDef }) {
  const { actor } = useHome()
  if (accessTo(actor, module.id) === 'none') return <div className="mt-5"><Notice>Tu perfil no tiene acceso a esta habitación. Pídeselo a quien administra el hogar.</Notice></div>
  return (
    <div className="mt-5">
      <Notice title="Esta habitación está cerrada" action={canManage(actor, 'modules') && <ButtonLink to="/ajustes#habitaciones">Elegir habitaciones</ButtonLink>}>
        En vuestro hogar no se usa. Lo que hubiera guardado se conserva.
      </Notice>
    </div>
  )
}
