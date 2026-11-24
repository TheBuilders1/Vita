import { Maximize, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { Component, lazy, Suspense, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useStore } from 'zustand'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Notice'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { settingsStore } from '@/store'
import { cameraStore } from '../camera/cameraStore'
import type { BuildingProps } from '../types'
import { Building2D } from './Building2D'
import { LabelLayer } from './LabelLayer'

const BuildingScene = lazy(() => import('./BuildingScene'))

function supportsWebGL2(): boolean {
  try {
    const context = document.createElement('canvas').getContext('webgl2')
    context?.getExtension('WEBGL_lose_context')?.loseContext()
    return context !== null
  } catch {
    return false
  }
}

/** Elige entre el edificio 3D y su versión sencilla; si el 3D falla, nunca se pierde la navegación. */
export function BuildingView({ decorative = false, ...props }: BuildingProps & { decorative?: boolean }) {
  const preference = useStore(settingsStore, (s) => s.settings.building)
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(() => preference === '3d' && !supportsWebGL2())
  const instant = useReducedMotion()
  const labels = useRef<HTMLDivElement>(null)
  const fail = () => setFailed(true)

  if (decorative && (failed || preference === 'simple')) return null
  if (preference === 'simple') return <Building2D {...props} />
  if (failed) {
    const retry = () => { setFailed(false); setAttempt(attempt + 1) }
    return (
      <div className="grid grid-cols-1 gap-4">
        <Notice tone="warning" title="El edificio en 3D no se puede mostrar" action={<Button icon={RotateCcw} onClick={retry}>Volver a intentarlo</Button>}>
          Aquí tienes las mismas habitaciones en una vista sencilla.
        </Notice>
        <Building2D {...props} />
      </div>
    )
  }
  return (
    <SceneBoundary key={attempt} onError={fail}>
      <Stage selection={`${props.floorId}/${props.moduleId}`} controls={!decorative}>
        <Suspense fallback={<p className="grid h-full place-items-center">Preparando el edificio…</p>}>
          <BuildingScene {...props} instant={instant} onLost={fail} labels={labels} />
          <LabelLayer ref={labels} {...props} />
        </Suspense>
      </Stage>
    </SceneBoundary>
  )
}

/** Zoom con botones o pellizco y arrastre para desplazarse. El encuadre vuelve al cambiar de habitación. */
function Stage({ selection, controls, children }: { selection: string; controls: boolean; children: ReactNode }) {
  const { zoomBy, panBy, reset } = cameraStore.getState()
  const zoomed = useStore(cameraStore, (s) => s.zoom > 1)
  const ref = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  useEffect(() => { reset() }, [selection, reset])

  useEffect(() => {
    const element = ref.current
    if (!element) return
    // Solo con Ctrl (o pellizco en el panel táctil): la rueda normal sigue desplazando la página.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      zoomBy(Math.exp(-e.deltaY * 0.006))
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoomBy])

  const move = (e: PointerEvent) => {
    const before = pointers.current.get(e.pointerId)
    if (!before) return
    const now = { x: e.clientX, y: e.clientY }
    const other = [...pointers.current].find(([id]) => id !== e.pointerId)?.[1]
    pointers.current.set(e.pointerId, now)
    if (other) {
      const distance = (p: { x: number; y: number }) => Math.hypot(p.x - other.x, p.y - other.y)
      if (distance(before) > 0) zoomBy(distance(now) / distance(before))
      return
    }
    const perMeter = cameraStore.getState().pixelsPerMeter
    panBy((before.x - now.x) / perMeter, (now.y - before.y) / perMeter)
  }
  const release = (e: PointerEvent) => { pointers.current.delete(e.pointerId) }

  return (
    <div className={controls ? 'relative h-full' : 'pointer-events-none relative h-full'}>
      <div
        ref={ref}
        aria-hidden="true"
        className={zoomed ? 'h-full touch-none cursor-grab' : 'h-full'}
        onPointerDown={(e) => pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
      >
        {children}
      </div>
      {controls && <div role="group" aria-label="Encuadre del edificio" className="absolute bottom-1 left-0 flex flex-wrap gap-1">
        <Button size="sm" icon={ZoomIn} onClick={() => zoomBy(1.4)}>Acercar</Button>
        {zoomed && <Button size="sm" icon={ZoomOut} onClick={() => zoomBy(1 / 1.4)}>Alejar</Button>}
        {zoomed && <Button size="sm" icon={Maximize} onClick={reset}>Encuadrar</Button>}
      </div>}
    </div>
  )
}

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  override componentDidCatch(error: unknown) {
    console.error('Fallo en la escena 3D', error)
    this.props.onError()
  }
  override render() { return this.state.failed ? null : this.props.children }
}
