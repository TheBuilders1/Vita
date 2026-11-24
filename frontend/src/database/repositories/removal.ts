import type { VitaDb } from '@/database/db'
import type { RemovalPlan } from '@/services/integrity'

export interface RemovalSummary { removed: number; changed: number }

export const summarize = (plan: RemovalPlan): RemovalSummary => ({ removed: plan.removeIds.length, changed: plan.updates.length })

/** Debe ejecutarse dentro de una transacción de escritura sobre records y files. */
export async function applyRemoval(db: VitaDb, plan: RemovalPlan): Promise<void> {
  await db.files.where('recordId').anyOf(plan.removeIds).delete()
  await db.records.bulkDelete(plan.removeIds)
  await db.records.bulkPut(plan.updates)
}
