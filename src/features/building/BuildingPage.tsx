import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { NotFoundPage } from '@/app/NotFoundPage'
import { useHome } from '@/app/providers/home'
import { FloorDirectory } from '@/components/navigation/FloorDirectory'
import { LiftBar } from '@/components/navigation/LiftBar'
import { SummaryPanel } from '@/features/dashboard/SummaryPanel'
import { useAttention } from '@/hooks/useAttention'
import { useTitle } from '@/hooks/useTitle'
import { FLOORS } from '@/modules/floors'
import { MODULES } from '@/modules/registry'
import type { FloorId, ModuleId } from '@/modules/types'
import { pendingByModule } from '@/services/attention'
import { accessTo } from '@/services/permissions'
import { BuildingView } from '@/three/scene/BuildingView'
import { cx } from '@/utils/cx'
import { ModulePanel } from './ModulePanel'

const ROOMS = MODULES.filter((m) => m.floor !== null)

/** La dirección es la fuente de verdad: atrás, adelante y enlaces funcionan como en cualquier web. */
export function BuildingPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { family, actor } = useHome()
  const attention = useAttention()
  const [hovered, setHovered] = useState<ModuleId | null>(null)
  const [tab, setTab] = useState<'summary' | 'floors'>('summary')
  const floor = FLOORS.find((f) => f.id === params.floorId) ?? null
  const module = ROOMS.find((m) => m.id === params.moduleId && m.floor === params.floorId) ?? null

  const rooms = useMemo(() => {
    const pending = pendingByModule(attention)
    return ROOMS.map((m) => ({
      moduleId: m.id,
      pending: pending.get(m.id) ?? 0,
      enabled: family.enabledModules.includes(m.id) && accessTo(actor, m.id) !== 'none',
    }))
  }, [attention, family.enabledModules, actor])

  const missing = (params.floorId && !floor) || (params.moduleId && !module)
  const title = missing ? undefined : (module?.name ?? floor?.name)
  useTitle(title)
  if (missing) return <NotFoundPage />

  const selectFloor = (id: FloorId) => { void navigate(`/planta/${id}`) }
  const selectModule = (id: ModuleId) => {
    const target = ROOMS.find((m) => m.id === id)
    if (target) void navigate(`/planta/${target.floor}/${id}`)
  }
  const openFloors = () => { setTab('floors'); if (floor) void navigate('/edificio') }
  const openSummary = () => { setTab('summary'); if (floor) void navigate('/edificio') }
  const showFloors = floor !== null || tab === 'floors'

  return (
    <div className={cx('grid grid-cols-1 gap-3 lg:min-h-[34rem] lg:grow lg:basis-0 lg:grid-rows-[minmax(0,1fr)] lg:gap-6', module ? 'lg:grid-cols-[minmax(0,1fr)_minmax(28rem,38rem)]' : 'lg:grid-cols-[minmax(0,1fr)_25rem]')}>
      <h1 className="sr-only">{title ?? 'El edificio de tu hogar'}</h1>
      <div className={cx('relative lg:h-full', module ? 'h-[30dvh] min-h-52' : 'h-[48dvh] min-h-72', 'lg:min-h-0 lg:overflow-y-auto')}>
        <BuildingView
          rooms={rooms}
          floorId={floor?.id ?? null}
          moduleId={module?.id ?? null}
          hovered={hovered}
          onHover={setHovered}
          onSelectFloor={selectFloor}
          onSelectModule={selectModule}
        />
      </div>
      <LiftBar selected={floor?.id ?? null} onSelect={selectFloor} />
      <div className="relative lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        {module && floor ? <ModulePanel module={module} floor={floor} enabled={rooms.some((r) => r.moduleId === module.id && r.enabled)} /> : (
          <>
            <div className="mb-3 flex gap-1">
              <TabButton active={!showFloors} onClick={openSummary}>Resumen</TabButton>
              <TabButton active={showFloors} onClick={openFloors}>Plantas</TabButton>
            </div>
            {showFloors
              ? <FloorDirectory rooms={rooms} selected={floor?.id ?? null} hovered={hovered} onSelect={selectFloor} onHover={setHovered} onSelectModule={selectModule} />
              : <SummaryPanel />}
          </>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cx('min-h-12 min-w-0 flex-1 border-b-4 px-2 font-bold', active ? 'border-marino bg-crema' : 'border-borde bg-beige hover:bg-yeso')}>
      {children}
    </button>
  )
}
