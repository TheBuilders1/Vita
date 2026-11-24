import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useStore } from 'zustand'
import { NotFoundPage } from '@/app/NotFoundPage'
import { useHome } from '@/app/providers/home'
import { FloorDirectory, floorButtonId, roomButtonId } from '@/components/navigation/FloorDirectory'
import { LiftBar } from '@/components/navigation/LiftBar'
import { SummaryPanel } from '@/features/dashboard/SummaryPanel'
import { useAttention } from '@/hooks/useAttention'
import { useTitle } from '@/hooks/useTitle'
import { FLOORS } from '@/modules/floors'
import { MODULES } from '@/modules/registry'
import type { FloorId, ModuleId } from '@/modules/types'
import { pendingByModule } from '@/services/attention'
import { accessTo } from '@/services/permissions'
import { settingsStore } from '@/store'
import { BuildingView } from '@/three/scene/BuildingView'
import { cx } from '@/utils/cx'
import { revealIfOutOfView } from '@/utils/reveal'
import { ModulePanel } from './ModulePanel'

const ROOMS = MODULES.filter((m) => m.floor !== null)

/** La dirección es la fuente de verdad: atrás, adelante y enlaces funcionan como en cualquier web. */
export function BuildingPage() {
  const params = useParams()
  const navigate = useNavigate()
  const { family, actor } = useHome()
  const attention = useAttention()
  const [hovered, setHovered] = useState<ModuleId | null>(null)
  const bigText = useStore(settingsStore, (s) => s.settings.textSize !== 'normal')
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

  const openRoom = useRef<ModuleId | null>(null)
  const fromList = useRef(false)
  const arrival = useRef<HTMLElement | null>(null)
  // Antes de pintar: si no, al desaparecer lo enfocado se adelantaría useFocusGuard.
  useLayoutEffect(() => {
    const left = openRoom.current
    const pressed = fromList.current
    openRoom.current = module?.id ?? null
    fromList.current = false
    if (!floor || module) return
    // Desde el ascensor o la lista se va a la planta elegida. Desde el edificio no: se sigue mirando el edificio.
    // Al salir de una habitación se vuelve al punto desde el que se entró.
    const id = pressed ? floorButtonId(floor.id) : left && roomButtonId(left)
    const target = id && document.getElementById(id)
    if (!target) return
    target.focus({ preventScroll: true })
    arrival.current = target
  }, [floor, module])
  // Después de que ScrollRestoration coloque la página.
  useEffect(() => {
    if (arrival.current) revealIfOutOfView(arrival.current)
    arrival.current = null
  }, [floor, module])

  if (missing) return <NotFoundPage />

  // Cambiar de planta no es cambiar de pantalla: sin esto, la página saltaría arriba y lo pulsado quedaría fuera de la vista.
  const selectFloor = (id: FloorId) => { void navigate(`/planta/${id}`, { preventScrollReset: true }) }
  const chooseFloor = (id: FloorId) => {
    // Pulsar la planta ya abierta no cambia nada: la marca se quedaría puesta para la siguiente navegación.
    fromList.current = module !== null || floor?.id !== id
    selectFloor(id)
  }
  const selectModule = (id: ModuleId) => {
    const target = ROOMS.find((m) => m.id === id)
    if (target) void navigate(`/planta/${target.floor}/${id}`)
  }
  const openFloors = () => { setTab('floors'); if (floor) void navigate('/edificio', { preventScrollReset: true }) }
  const openSummary = () => { setTab('summary'); if (floor) void navigate('/edificio', { preventScrollReset: true }) }
  const showFloors = floor !== null || tab === 'floors'

  const lift = <LiftBar selected={floor?.id ?? null} onSelect={chooseFloor} />

  return (
    <div className={cx('grid grid-cols-1 gap-3 lg:min-h-[34rem] lg:grow lg:basis-0 lg:grid-rows-[minmax(0,1fr)] lg:gap-6', module ? 'lg:grid-cols-[minmax(0,1fr)_minmax(28rem,38rem)]' : 'lg:grid-cols-[minmax(0,1fr)_25rem]')}>
      <h1 className="sr-only">{title ?? 'El edificio de tu hogar'}</h1>
      {/* Con letra grande el edificio empujaría las plantas fuera de la pantalla del móvil. */}
      {bigText && lift}
      <div key="building" className="relative lg:h-full lg:min-h-0 lg:overflow-y-auto">
        {/* El alto fijo es solo del 3D: la vista sencilla ocupa lo que necesite. */}
        <BuildingView
          stageClassName={cx(module ? 'h-[30dvh] min-h-[180px]' : 'h-[44dvh] min-h-[220px]', 'lg:h-full lg:min-h-0')}
          rooms={rooms}
          floorId={floor?.id ?? null}
          moduleId={module?.id ?? null}
          hovered={hovered}
          onHover={setHovered}
          onSelectFloor={selectFloor}
          onSelectModule={selectModule}
        />
      </div>
      {!bigText && lift}
      <div className="relative lg:min-h-0 lg:overflow-y-auto lg:pr-1">
        {module && floor ? <ModulePanel module={module} floor={floor} enabled={rooms.some((r) => r.moduleId === module.id && r.enabled)} /> : (
          <>
            <div className="mb-3 flex gap-1">
              <TabButton active={!showFloors} onClick={openSummary}>Resumen</TabButton>
              <TabButton active={showFloors} onClick={openFloors}>Plantas</TabButton>
            </div>
            {showFloors
              ? <FloorDirectory rooms={rooms} selected={floor?.id ?? null} hovered={hovered} onSelect={chooseFloor} onHover={setHovered} onSelectModule={selectModule} />
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
