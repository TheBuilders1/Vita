import { CircleAlert, CircleCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { toastStore } from '@/store'
import type { Toast } from '@/store/toastStore'

/** Con «Deshacer» hay que dar tiempo a leer y decidir (WCAG 2.2.1). El reloj se para con el ratón o el foco encima. */
const SUCCESS_MS = 6000
const UNDO_MS = 20_000
const LINK = 'min-h-11 px-3 font-bold underline underline-offset-4'

/** Las zonas vivas están siempre montadas: si no, el lector de pantalla no anuncia el primer aviso. */
export function Toaster() {
  const toasts = useStore(toastStore, (s) => s.toasts)
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-3 max-md:bottom-24 lg:right-auto lg:bottom-24 lg:items-start">
      <div role="alert" className="contents">{toasts.filter((t) => t.tone === 'error').map((t) => <ToastCard key={t.id} toast={t} />)}</div>
      <output className="contents">{toasts.filter((t) => t.tone === 'success').map((t) => <ToastCard key={t.id} toast={t} />)}</output>
    </div>
  )
}

function ToastCard({ toast }: { toast: Toast }) {
  const { dismiss } = toastStore.getState()
  const isError = toast.tone === 'error'
  const hasAction = toast.action !== undefined
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (isError || held) return
    const timer = setTimeout(() => dismiss(toast.id), hasAction ? UNDO_MS : SUCCESS_MS)
    return () => clearTimeout(timer)
  }, [dismiss, isError, held, hasAction, toast.id])

  const Icon = isError ? CircleAlert : CircleCheck
  return (
    <div onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)} onFocus={() => setHeld(true)} onBlur={() => setHeld(false)} className={`on-dark pointer-events-auto flex w-full max-w-md flex-wrap items-center gap-x-3 gap-y-1 p-4 text-crema ${isError ? 'bg-peligro' : 'bg-oliva'}`}>
      <Icon aria-hidden="true" className="size-6 shrink-0" />
      <p className="min-w-40 flex-1 font-bold">{toast.message}</p>
      <div className="ml-auto flex flex-wrap justify-end">
        {toast.action && <button type="button" onClick={() => { toast.action?.run(); dismiss(toast.id) }} className={LINK}>{toast.action.label}</button>}
        <button type="button" onClick={() => dismiss(toast.id)} className={LINK}>Cerrar aviso</button>
      </div>
    </div>
  )
}
