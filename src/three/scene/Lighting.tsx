import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { DirectionalLight } from 'three'
import { BUILDING, ROOF_Y } from '../config'

/** Sol cálido de tarde desde el lado de la cámara: entra en las habitaciones. La sombra se calcula una vez. */
export function Lighting() {
  const sun = useRef<DirectionalLight>(null)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    const light = sun.current
    if (!light) return
    light.target.position.set(BUILDING.width / 2, ROOF_Y / 2, 1.5)
    scene.add(light.target)
    light.target.updateMatrixWorld()
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    invalidate()
    return () => { scene.remove(light.target) }
  }, [gl, scene, invalidate])

  return (
    <>
      <hemisphereLight args={['#fffaf0', '#b3a690', 1.9]} />
      <directionalLight
        ref={sun}
        color="#fff0d6"
        intensity={2.1}
        position={[BUILDING.width / 2 + 11, ROOF_Y / 2 + 17, 27]}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-normalBias={0.03}
        shadow-bias={-0.0006}
        shadow-radius={2.5}
      />
    </>
  )
}
