import { useState } from 'react'
import { useHome } from '@/app/providers/home'
import { canManage } from '@/services/permissions'
import { WipeDialog } from './WipeDialog'

export function DemoBanner() {
  const { actor } = useHome()
  const [open, setOpen] = useState(false)
  return (
    <aside aria-label="Familia de demostración" className="flex flex-wrap items-center justify-between gap-x-6 bg-aviso-fondo px-4 sm:px-6">
      <p className="py-1.5"><span className="sm:hidden">Datos de ejemplo</span><span className="max-sm:hidden">Estás viendo una familia de demostración. Todo es ficticio.</span></p>
      {canManage(actor, 'data') && (
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 font-bold underline underline-offset-4">Crear mi familia</button>
      )}
      <WipeDialog open={open} title="Salir de la demostración" confirmLabel="Borrar la demostración" onClose={() => setOpen(false)} destination="/crear">
        Se borrará la familia de demostración con los cambios que hayas hecho y empezarás con la tuya.
      </WipeDialog>
    </aside>
  )
}
