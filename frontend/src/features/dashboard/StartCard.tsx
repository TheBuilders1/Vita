import { DoorOpen, Plus, Type, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button, ButtonLink } from '@/components/ui/Button'
import { AddDialog } from '@/features/planner/AddDialog'
import { canManage } from '@/services/permissions'

/** Primer paso concreto en un hogar recién creado. Desaparece en cuanto hay algo apuntado. */
export function StartCard() {
  const { members, records, actor } = useHome()
  const [adding, setAdding] = useState(false)
  if (records.length > 0 || !canManage(actor, 'family')) return null
  return (
    <section aria-label="Primeros pasos" className="mb-3 bg-aviso-fondo p-4 max-[24rem]:p-2">
      <h2 className="text-lg font-bold">Tu hogar está listo. Empieza por aquí</h2>
      <p className="mt-1">Apunta lo primero que tengas en la cabeza: una cita, una tarea o un documento que caduca.</p>
      <div className="mt-3"><Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>Apuntar lo primero</Button></div>
      <p className="mt-5 font-bold">Cuando quieras, completa tu hogar</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {members.length === 1 && <ButtonLink to="/hogar/nuevo" icon={UserPlus}>Añadir a otra persona</ButtonLink>}
        <ButtonLink to="/ajustes#habitaciones" icon={DoorOpen}>Elegir habitaciones</ButtonLink>
        <ButtonLink to="/ajustes" icon={Type}>Cambiar el tamaño de la letra</ButtonLink>
      </div>
      <AddDialog open={adding} onClose={() => setAdding(false)} />
    </section>
  )
}
