import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { repositories } from '@/database'

/** Archivo guardado y una dirección temporal para mostrarlo. La dirección se libera al desmontar. */
export function useFile(id: string) {
  const { actor } = useHome()
  const file = useLiveQuery(() => repositories.files.get(actor.id, id), [actor.id, id])
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
