import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { useHome } from '@/app/providers/home'
import { Avatar } from '@/components/ui/Avatar'
import { Dialog } from '@/components/ui/Dialog'
import { repositories } from '@/database'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'
import type { Member } from '@/types/family'

/** Cambia el perfil simulado. No pide contraseña: no es un control de acceso. */
export function ProfileSwitcher() {
  const { actor, members } = useHome()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [changing, setChanging] = useState(false)
  const [error, setError] = useState<string>()
  const close = () => { setOpen(false); setError(undefined) }

  const change = async (member: Member) => {
    if (changing) return
    if (member.id === actor.id) { close(); return }
    const { show, clear } = toastStore.getState()
    setChanging(true)
    setError(undefined)
    try {
      await repositories.session.use(member.id)
      // Los «Deshacer» pendientes actuarían con los permisos del perfil anterior.
      clear()
      close()
      void navigate('/')
      show(`Ahora usas Vita como ${member.name}`)
    } catch (cause) {
      setError(describeError(cause))
    } finally {
      setChanging(false)
    }
  }
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)}
        className="flex min-h-11 min-w-11 max-w-44 items-center gap-2 border-2 border-beige bg-marino-hondo px-2 font-bold text-crema hover:bg-marino max-sm:max-w-[44vw] max-[24rem]:gap-1 max-[24rem]:px-1">
        <Avatar name={actor.name} photo={actor.photo} size="sm" />
        <span className="min-w-0 flex-1 truncate"><span className="sr-only">Cambiar de perfil. Perfil activo: </span>{actor.name}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      </button>
      {open && createPortal(<Dialog open={open} onClose={close} title="Elegir perfil" error={error}>
        <div role="status">{changing && 'Cambiando de perfil…'}</div>
        <ul className="grid grid-cols-1 gap-2">
          {members.map((member) => (
            <li key={member.id}>
              <button type="button" aria-current={member.id === actor.id ? 'true' : undefined} aria-disabled={changing}
                onClick={() => { void change(member) }} className="flex min-h-11 w-full items-center gap-3 bg-yeso px-3 py-1.5 text-left hover:bg-beige aria-current:bg-aviso-fondo">
                <Avatar name={member.name} photo={member.photo} size="sm" />
                <span className="min-w-0 [overflow-wrap:anywhere]"><strong>{member.name}</strong>{member.id === actor.id && ' (perfil activo)'}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>, document.body)}
    </>
  )
}
