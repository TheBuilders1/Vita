import { getModule } from '@/modules/registry'
import type { ModuleId } from '@/modules/types'

export function moduleLink(id: ModuleId): string {
  const { floor } = getModule(id)
  return floor ? `/planta/${floor}/${id}` : '/tareas'
}
export const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`
