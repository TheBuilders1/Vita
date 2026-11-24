import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Color } from 'three'
import type { ModuleId } from '@/modules/types'
import { floorY } from '../config'
import { createPixelMaterial } from '../materials/pixelMaterial'
import { buildZone } from './buildZone'
import type { Zone } from './layout'

export type ZoneMood = 'normal' | 'hover' | 'selected' | 'muted' | 'off'

/** Tinte y luz propia de cada estado. */
const MOODS: Record<ZoneMood, { color: Color; emissive: Color }> = {
  normal: { color: new Color('#ffffff'), emissive: new Color('#000000') },
  hover: { color: new Color('#ffffff'), emissive: new Color('#5a4520') },
  selected: { color: new Color('#ffffff'), emissive: new Color('#4a3a1e') },
  muted: { color: new Color('#b9b9bd'), emissive: new Color('#000000') },
  off: { color: new Color('#77797d'), emissive: new Color('#000000') },
}
/** Un clic con arrastre es un desplazamiento, no una selección. */
export const CLICK_TOLERANCE = 6

interface ZoneMeshProps {
  zone: Zone
  mood: ZoneMood
  instant: boolean
  onHover: (moduleId: ModuleId | null) => void
  onSelect: (moduleId: ModuleId) => void
}

export function ZoneMesh({ zone, mood, instant, onHover, onSelect }: ZoneMeshProps) {
  const invalidate = useThree((s) => s.invalidate)
  const geometry = useMemo(() => buildZone(zone), [zone])
  const material = useMemo(() => createPixelMaterial(), [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  useEffect(() => { invalidate() }, [mood, invalidate])

  useFrame((_, delta) => {
    const target = MOODS[mood]
    if (material.color.equals(target.color) && material.emissive.equals(target.emissive)) return
    const t = instant ? 1 : 1 - Math.exp(-9 * Math.min(delta, 0.05))
    approach(material.color, target.color, t)
    approach(material.emissive, target.emissive, t)
    invalidate()
  })

  const enabled = mood !== 'off'
  const handlers = {
    onPointerOver: (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); if (enabled && e.pointerType !== 'touch') onHover(zone.moduleId) },
    onPointerOut: () => onHover(null),
    onClick: (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); if (enabled && e.delta <= CLICK_TOLERANCE) onSelect(zone.moduleId) },
  }
  return <mesh geometry={geometry} material={material} position={[zone.x0, floorY(zone.level), 0]} castShadow receiveShadow {...handlers} />
}

function approach(color: Color, target: Color, t: number) {
  color.lerp(target, t)
  if (Math.abs(color.r - target.r) + Math.abs(color.g - target.g) + Math.abs(color.b - target.b) < 0.004) color.copy(target)
}
