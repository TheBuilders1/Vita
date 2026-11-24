import { withChange } from '@/services/history'
import type { RemovalPlan } from '@/services/integrity'
import { nextStamp } from '@/utils/stamps'
import type { RepositoryContext } from './context'

export interface RemovalSummary { removed: number; changed: number }

export const summarize = (plan: RemovalPlan): RemovalSummary => ({ removed: plan.removeIds.length, changed: plan.updates.length })

/** Debe ejecutarse dentro de una transacción de escritura sobre records y files. */
export async function applyRemoval({ db, now }: RepositoryContext, actorId: string, plan: RemovalPlan): Promise<void> {
  const before = await db.records.bulkGet(plan.updates.map((r) => r.id))
  await db.files.where('recordId').anyOf(plan.removeIds).delete()
  await db.records.bulkDelete(plan.removeIds)
  // Perder un enlace también es un cambio: un formulario abierto antes no debe pisarlo.
  await db.records.bulkPut(plan.updates.map((next, i) => {
    const updatedAt = nextStamp(next.updatedAt, now())
    return withChange(before[i] ?? next, { ...next, updatedAt }, { by: actorId, at: updatedAt })
  }))
}
