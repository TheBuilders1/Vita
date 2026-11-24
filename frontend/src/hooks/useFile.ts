import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { repositories } from '@/database'

/**
 * Archivo guardado y una dirección temporal para mostrarlo. La dirección se libera al desmontar.
 * `undefined` es que aún se está leyendo; `null`, que ya no está o este perfil no puede verlo.
 */
export function useFile(id: string) {
  const { actor } = useHome()
  const file = useLiveQuery(async () => (await repositories.files.get(actor.id, id)) ?? null, [actor.id, id])
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!file) return
    const next = URL.createObjectURL(file.blob)
    // oxlint-disable-next-line react/set-state-in-effect -- la dirección es un recurso externo que hay que liberar
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return { file, url }
}
