import { useEffect, useRef } from 'react'
import { drawLandscape, LANDSCAPE } from './landscape'

const PIXEL = { wide: 4, narrow: 3 }

/** Paisaje fijo tras el contenido. Se dibuja a baja resolución y se amplía sin suavizar. Es solo decorativo. */
export function Backdrop({ variant = 'soft', quiet = 0 }: { variant?: keyof typeof LANDSCAPE; quiet?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const draw = () => {
      const canvas = ref.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return
      const wide = innerWidth >= 1024
      const pixel = wide ? PIXEL.wide : PIXEL.narrow
      const [width, height] = [Math.ceil(innerWidth / pixel), Math.ceil(innerHeight / pixel)]
      if (canvas.width !== width || canvas.height !== height) Object.assign(canvas, { width, height })
      drawLandscape(context, width, height, LANDSCAPE[variant], wide || quiet === 0 ? quiet : 1)
    }
    draw()
    // En móvil, la barra del navegador cambia el alto al desplazarse: solo se redibuja si cambia el ancho o mucho el alto.
    let [w, h] = [innerWidth, innerHeight]
    const onResize = () => {
      if (innerWidth === w && Math.abs(innerHeight - h) < 160) return
      ;[w, h] = [innerWidth, innerHeight]
      draw()
    }
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [variant, quiet])

  return <canvas ref={ref} aria-hidden="true" className="backdrop fixed inset-0 -z-10 h-lvh w-full" />
}
