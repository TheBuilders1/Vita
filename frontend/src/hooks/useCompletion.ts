import { useHome } from '@/app/providers/home'
import { repositories } from '@/database'
import type { AgendaItem } from '@/services/agenda'
import { completionFor, completionMessage } from '@/services/completion'
import { describeError } from '@/services/errors'
import { canComplete } from '@/services/permissions'
import { toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'
import { useToday } from './useToday'

const fail = (error: unknown) => toastStore.getState().show(describeError(error), 'error')

export interface CompletionNotice {
  readonly message: string
  readonly undo: () => Promise<unknown>
}

interface Feedback {
  readonly success: (notice: CompletionNotice) => void
  readonly error: (error: unknown) => void
}

const notify = ({ message, undo }: CompletionNotice) =>
  toastStore.getState().show(message, 'success', { label: 'Deshacer', run: () => { undo().catch(fail) } })

const toastFeedback: Feedback = { success: notify, error: fail }

export function useCompletion() {
  const { actor, records } = useHome()
  const today = useToday()

  const setDone = async (record: FamilyRecord, title: string, done: boolean, success = notify) => {
    const dueDate = record.data.dueDate
    const expected = record.typeId === 'task' ? { dueDate, done: !done } : undefined
    const saved = await repositories.records.setDone(actor.id, record.id, done, expected)
    const next = saved.data.dueDate
    if (done) success({
      message: completionMessage(title, today, typeof next === 'string' && next !== dueDate ? next : undefined), undo: saved.undo,
    })
  }

  return {
    forItem(item: AgendaItem): { label: string; run: () => void } | null {
      const record = records.find((r) => r.id === item.recordId)
      if (!record) return null
      const completion = completionFor(item, record, actor, today)
      if (!completion) return null

      const complete = async () => {
        if (completion.kind === 'log') {
          const saved = await repositories.records.create(actor.id, completion)
          notify({ message: completionMessage(item.title, today), undo: () => repositories.records.erase(actor.id, saved.id) })
        } else {
          await setDone(record, item.title, true)
        }
      }
      return { label: item.category === 'medication' ? 'Tomada' : 'Hecho', run: () => { complete().catch(fail) } }
    },

    forRecord(record: FamilyRecord, title: string, done: boolean, feedback = toastFeedback) {
      return canComplete(actor, record) ? () => setDone(record, title, !done, feedback.success).catch(feedback.error) : undefined
    },
  }
}
