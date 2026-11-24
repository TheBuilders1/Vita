import { UserRound } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useHome } from '@/app/providers/home'
import { repositories } from '@/database'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'

/** Cambia el perfil simulado. No pide contraseña: no es un control de acceso. */
export function ProfileSwitcher() {
  const { actor, members } = useHome()
  const navigate = useNavigate()

  const change = async (id: string) => {
    const { show, clear } = toastStore.getState()
    try {
      await repositories.session.use(id)
      // Los «Deshacer» pendientes actuarían con los permisos del perfil anterior.
      clear()
      void navigate('/')
      show(`Ahora usas Vita como ${members.find((m) => m.id === id)?.name}`)
    } catch (error) {
      show(describeError(error), 'error')
    }
  }
  return (
    <label className="flex items-center gap-2">
      <UserRound aria-hidden="true" className="size-5" />
      <span className="sr-only">Perfil activo</span>
      <select value={actor.id} onChange={(e) => { void change(e.target.value) }} className="min-h-11 max-w-36 border-2 border-beige bg-marino-hondo px-2 font-bold text-crema">
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </label>
  )
}
