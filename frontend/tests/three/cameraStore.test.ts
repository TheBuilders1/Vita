import { expect, test } from 'vitest'
import { createCameraStore } from '@/three/camera/cameraStore'

test('la ampliación tiene límites', () => {
  const s = createCameraStore()
  s.getState().zoomBy(100)
  expect(s.getState().zoom).toBe(4)
  s.getState().zoomBy(0.001)
  expect(s.getState().zoom).toBe(1)
})
test('sin ampliar no se desplaza y al volver al encuadre se recentra', () => {
  const s = createCameraStore()
  s.getState().panBy(2, 2)
  expect(s.getState().pan).toEqual([0, 0])
  s.getState().zoomBy(2)
  s.getState().panBy(2, -1)
  expect(s.getState().pan).toEqual([2, -1])
  s.getState().zoomBy(0.1)
  expect(s.getState().pan).toEqual([0, 0])
})
