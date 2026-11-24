import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { MathUtils, type Mesh } from 'three'
import { floorY } from '../config'
import { createPixelMaterial } from '../materials/pixelMaterial'
import { buildLiftCab } from './buildStructure'

/** La cabina acompaña a la planta elegida; para ir a una planta basta con pulsarla. */
export function Elevator({ level, instant }: { level: number; instant: boolean }) {
  const ref = useRef<Mesh>(null)
  const invalidate = useThree((s) => s.invalidate)
  const geometry = useMemo(() => buildLiftCab(), [])
  const material = useMemo(() => createPixelMaterial(), [])
  const target = floorY(level)
  useEffect(() => () => { geometry.dispose(); material.dispose() }, [geometry, material])
  useEffect(() => { invalidate() }, [target, invalidate])

  useFrame((_, delta) => {
    const cab = ref.current
    if (!cab || cab.position.y === target) return
    const next = MathUtils.damp(cab.position.y, target, 2.6, Math.min(delta, 0.05))
    cab.position.y = instant || Math.abs(next - target) < 0.01 ? target : next
    invalidate()
  })
  return <mesh ref={ref} geometry={geometry} material={material} raycast={() => null} />
}
