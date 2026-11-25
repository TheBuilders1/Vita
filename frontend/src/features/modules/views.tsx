import { lazy, type ComponentType } from 'react'
import type { ModuleId } from '@/modules/types'

/** Módulos con vista propia. Los demás usan la común (ModuleRecords). */
export const MODULE_VIEWS: Partial<Record<ModuleId, ComponentType>> = {
  cooking: lazy(async () => ({ default: (await import('./CookingView')).CookingView })),
  fridge: lazy(async () => ({ default: (await import('./FridgeView')).FridgeView })),
  medication: lazy(async () => ({ default: (await import('./MedicationView')).MedicationView })),
  emergency: lazy(async () => ({ default: (await import('./EmergencyView')).EmergencyView })),
  finances: lazy(async () => ({ default: (await import('./FinancesView')).FinancesView })),
  savings: lazy(async () => ({ default: (await import('./SavingsView')).SavingsView })),
  kidsMoney: lazy(async () => ({ default: (await import('./KidsMoneyView')).KidsMoneyView })),
  documents: lazy(async () => ({ default: (await import('./DocumentsView')).DocumentsView })),
  cybersecurity: lazy(async () => ({ default: (await import('./CybersecurityView')).CybersecurityView })),
  shopping: lazy(async () => ({ default: (await import('./ShoppingView')).ShoppingView })),
  album: lazy(async () => ({ default: (await import('./AlbumView')).AlbumView })),
}
