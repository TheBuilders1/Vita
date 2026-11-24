import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react'
import { MathUtils, type OrthographicCamera } from 'three'
import { useStore } from 'zustand'
import { WORLD_BOUNDS } from '../config'
import { cameraStore } from './cameraStore'
import { frameBox, keepInside, viewAxes, type Box } from './framing'

const { right, up, toCamera } = viewAxes()
const DISTANCE = 60
const SPEED = 5

/** Encuadra `box` con ángulo fijo y se mueve con suavidad; con movimiento reducido, salta. */
export function CameraRig({ box, instant, labels }: { box: Box; instant: boolean; labels: RefObject<HTMLElement | null> }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const zoom = useStore(cameraStore, (s) => s.zoom)
  const pan = useStore(cameraStore, (s) => s.pan)
  const current = useRef<{ x: number; y: number; zoom: number } | null>(null)

  const target = useMemo(() => {
    const frame = frameBox(box, size)
    const wanted = { center: [frame.center[0] + pan[0], frame.center[1] + pan[1]] as const, zoom: frame.zoom * zoom }
    const { center: [x, y], zoom: scale } = keepInside(wanted, WORLD_BOUNDS, size)
    return { x, y, zoom: scale }
  }, [box, size, zoom, pan])

  useLayoutEffect(() => {
    camera.position.set(...toCamera).multiplyScalar(DISTANCE)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
  }, [camera])

  useEffect(() => {
    cameraStore.setState({ pixelsPerMeter: target.zoom })
    invalidate()
  }, [target, invalidate])

  useFrame((_, delta) => {
    const c = current.current ?? { ...target }
    current.current = c
    const dt = Math.min(delta, 0.05)
    const settle = (from: number, to: number, epsilon: number) =>
      instant || Math.abs(to - from) < epsilon ? to : MathUtils.damp(from, to, SPEED, dt)
    c.x = settle(c.x, target.x, 0.002)
    c.y = settle(c.y, target.y, 0.002)
    c.zoom = settle(c.zoom, target.zoom, 0.02)
    camera.position.set(
      right[0] * c.x + up[0] * c.y + toCamera[0] * DISTANCE,
      right[1] * c.x + up[1] * c.y + toCamera[1] * DISTANCE,
      right[2] * c.x + up[2] * c.y + toCamera[2] * DISTANCE,
    )
    camera.zoom = c.zoom
    camera.updateProjectionMatrix()
    const style = labels.current?.style
    style?.setProperty('--vx', String(c.x))
    style?.setProperty('--vy', String(c.y))
    style?.setProperty('--vz', String(c.zoom))
    if (c.x !== target.x || c.y !== target.y || c.zoom !== target.zoom) invalidate()
  })
  return null
}
