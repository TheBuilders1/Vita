import { createStore } from 'zustand/vanilla'

export interface CameraState {
  /** Ampliación sobre el encuadre automático. */
  zoom: number
  /** Desplazamiento en metros sobre el plano de la pantalla. */
  pan: readonly [number, number]
  /** La escribe la cámara; traduce el arrastre de píxeles a metros. */
  pixelsPerMeter: number
  zoomBy: (factor: number) => void
  panBy: (dx: number, dy: number) => void
  reset: () => void
}

const MIN = 1
const MAX = 4

export const createCameraStore = () =>
  createStore<CameraState>()((set) => ({
    zoom: 1,
    pan: [0, 0],
    pixelsPerMeter: 40,
    zoomBy: (factor) => set(({ zoom, pan }) => {
      const next = Math.min(MAX, Math.max(MIN, zoom * factor))
      return { zoom: next, pan: next === MIN ? [0, 0] : pan }
    }),
    panBy: (dx, dy) => set(({ pan, zoom }) => (zoom === MIN ? {} : { pan: [pan[0] + dx, pan[1] + dy] })),
    reset: () => set({ zoom: 1, pan: [0, 0] }),
  }))

export const cameraStore = createCameraStore()
