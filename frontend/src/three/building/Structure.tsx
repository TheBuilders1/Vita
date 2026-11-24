import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type { FloorId } from '@/modules/types'
import { BUILDING } from '../config'
import { createPixelMaterial } from '../materials/pixelMaterial'
import { floorOnLevel } from '../rooms/layout'
import { CLICK_TOLERANCE } from '../rooms/ZoneMesh'
import { buildStructure } from './buildStructure'

/** También recibe el puntero: pulsar un forjado, la escalera o el ascensor lleva a esa planta. */
export function Structure({ onSelectFloor }: { onSelectFloor: (floorId: FloorId) => void }) {
  const geometry = useMemo(() => buildStructure(), [])
  const material = useMemo(() => createPixelMaterial(), [])
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])

  const select = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const level = Math.floor((e.point.y + BUILDING.slab) / BUILDING.storey) + 1
    if (e.delta > CLICK_TOLERANCE || e.point.y < -BUILDING.slab || level > BUILDING.floors || e.point.z > BUILDING.depth + 0.2) return
    onSelectFloor(floorOnLevel(level).id)
  }
  return <mesh geometry={geometry} material={material} castShadow receiveShadow onClick={select} onPointerOver={(e) => e.stopPropagation()} />
}
