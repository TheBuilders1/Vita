import { DoorOpen, Plus, Type, UserPlus } from 'lucide-react'
import { useHome } from '@/app/providers/home'
import { Button, ButtonLink } from '@/components/ui/Button'

/** Primer paso concreto en un hogar recién creado. Desaparece en cuanto hay algo apuntado. */
export function StartCard({ onAdd }: { onAdd: () => void }) {
  const { members } = useHome()
  return (
    <div className="mt-3 bg-aviso-fondo p-4 max-[24rem]:p-2">
      <h3 className="text-lg font-bold">Empieza por aquí</h3>
      <p className="mt-1">Apunta lo primero que tengas en la cabeza: una cita, una tarea o un documento que caduca.</p>
      <div className="mt-3"><Button variant="primary" icon={Plus} onClick={onAdd}>Apuntar lo primero</Button></div>
      <p className="mt-5 font-bold">Cuando quieras, completa tu hogar</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {members.length === 1 && <ButtonLink to="/hogar/nuevo" icon={UserPlus}>Añadir a otra persona</ButtonLink>}
        <ButtonLink to="/ajustes#habitaciones" icon={DoorOpen}>Elegir habitaciones</ButtonLink>
        <ButtonLink to="/ajustes" icon={Type}>Cambiar el tamaño de la letra</ButtonLink>
      </div>
    </div>
  )
}
