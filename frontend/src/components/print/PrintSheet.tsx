import { useEffect, useEffectEvent, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { todayIso } from '@/utils/dates'
import { formatDate } from '@/utils/format'

const WAIT_MS = 5000
const pause = (ms: number) => new Promise((resolve) => { setTimeout(resolve, ms) })

/** Los archivos llegan después (`data-pending`) y sus imágenes, más tarde aún. Ninguna puede impedir imprimir lo demás. */
async function settled(sheet: HTMLElement | null): Promise<void> {
  const limit = Date.now() + WAIT_MS
  while (sheet?.querySelector('[data-pending]') && Date.now() < limit) await pause(50)
  // Lo que no llegó a tiempo se dice en la propia hoja.
  for (const pending of sheet?.querySelectorAll('[data-pending]') ?? []) pending.textContent = 'Falta un archivo que no se ha podido leer a tiempo.'
  const images = [...(sheet?.querySelectorAll('img') ?? [])].map((img) => img.decode().catch(() => undefined))
  await Promise.race([Promise.all(images), pause(Math.max(0, limit - Date.now()))])
}

/** Monta la hoja fuera de la aplicación, espera a sus imágenes e imprime. Al cerrar la ventana de impresión avisa con `onDone`. */
export function PrintSheet({ children, onDone }: { children: ReactNode; onDone: () => void }) {
  const sheet = useRef<HTMLDivElement>(null)
  const done = useEffectEvent(onDone)
  useEffect(() => {
    let active = true
    const finish = () => done()
    void settled(sheet.current).then(() => {
      if (!active) return
      window.addEventListener('afterprint', finish, { once: true })
      window.print()
    })
    return () => { active = false; window.removeEventListener('afterprint', finish) }
  }, [])
  return createPortal(
    <div ref={sheet} className="print-sheet">
      {children}
      <p>Impreso desde Vita el {formatDate(todayIso())}.</p>
    </div>,
    document.body,
  )
}
