import { OrthographicCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useMemo, type RefObject } from 'react'
import { PCFShadowMap, NoToneMapping } from 'three'
import { FLOORS } from '@/modules/floors'
import { Elevator } from '../building/Elevator'
import { Structure } from '../building/Structure'
import { CameraRig } from '../camera/CameraRig'
import { BUILDING, WORLD_BOUNDS } from '../config'
import { levelBox, zoneBox } from '../rooms/bounds'
import { ZONES, zoneOf, type Zone } from '../rooms/layout'
import { ZoneMesh, type ZoneMood } from '../rooms/ZoneMesh'
import type { BuildingProps } from '../types'
import { Lighting } from './Lighting'

/** Sombra de contacto: asienta el edificio sobre el prado del fondo. */
function GroundShadow() {
  return (
    <mesh position={[BUILDING.width / 2 - 0.9, -0.71, 0.9]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[BUILDING.width + 3, BUILDING.depth + 3]} />
      <meshBasicMaterial color="#4a4f2c" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  )
}

interface SceneProps extends BuildingProps { readonly instant: boolean; readonly onLost: () => void; readonly labels: RefObject<HTMLElement | null> }

export default function BuildingScene({ rooms, floorId, moduleId, hovered, instant, onHover, onSelectFloor, onSelectModule, onLost, labels }: SceneProps) {
  const level = FLOORS.find((f) => f.id === floorId)?.level ?? null
  const status = useMemo(() => new Map(rooms.map((r) => [r.moduleId, r])), [rooms])

  const box = useMemo(() => {
    if (moduleId) return zoneBox(zoneOf(moduleId))
    return level ? levelBox(level) : WORLD_BOUNDS
  }, [level, moduleId])

  const moodOf = (zone: Zone): ZoneMood => {
    if (status.get(zone.moduleId)?.enabled === false) return 'off'
    if (zone.moduleId === moduleId) return 'selected'
    if (zone.moduleId === hovered) return 'hover'
    return (level !== null && zone.level !== level) || moduleId ? 'muted' : 'normal'
  }

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      shadows={{ type: PCFShadowMap }}
      gl={{ antialias: true, alpha: true, toneMapping: NoToneMapping, powerPreference: 'default' }}
      onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', onLost, { once: true })}
      style={{ cursor: hovered ? 'pointer' : undefined, touchAction: 'pan-y' }}
      tabIndex={-1}
    >
      <OrthographicCamera makeDefault near={1} far={140} />
      <CameraRig box={box} instant={instant} labels={labels} />
      <Lighting />
      <GroundShadow />
      <Structure onSelectFloor={onSelectFloor} />
      <Elevator level={level ?? 1} instant={instant} />
      {ZONES.map((zone) => (
        <ZoneMesh key={zone.moduleId} zone={zone} mood={moodOf(zone)} instant={instant} onHover={onHover} onSelect={onSelectModule} />
      ))}
    </Canvas>
  )
}
