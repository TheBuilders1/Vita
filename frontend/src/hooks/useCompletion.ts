import { useHome } from '@/app/providers/home'
import { repositories } from '@/database'
import type { AgendaItem } from '@/services/agenda'
import { completionFor } from '@/services/completion'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'
import { useToday } from './useToday'

const fail = (error: unknown) => toastStore.getState().show(describeError(error), 'error')

/** Botón para dar por hecho algo de la agenda, siempre con «Deshacer». */
export function useCompletion() {
  const { actor, records } = useHome()
  const today = useToday()

  return (item: AgendaItem): { label: string; run: () => void } | null => {
    const record = records.find((r) => r.id === item.recordId)
    const completion = record ? completionFor(item, record, actor, today) : null
    if (!completion) return null

    const complete = async (): Promise<() => Promise<unknown>> => {
      if (completion.kind === 'log') {
        const saved = await repositories.records.create(actor.id, completion)
        return () => repositories.records.remove(actor.id, saved.id)
      }
      await repositories.records.setDone(actor.id, completion.recordId, true)
      return () => repositories.records.setDone(actor.id, completion.recordId, false)
    }
    const run = () => {
      complete()
        .then((undo) => toastStore.getState().show(`Hecho: ${item.title}`, 'success', { label: 'Deshacer', run: () => { undo().catch(fail) } }))
        .catch(fail)
    }
    return { label: item.category === 'medication' ? 'Tomada' : 'Hecho', run }
  }
}
