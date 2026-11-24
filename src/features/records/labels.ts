import type { Visibility } from '@/modules/types'

export const VISIBILITY_LABELS: Record<Visibility, { label: string; hint: string }> = {
  family: { label: 'La familia', hint: 'Quien tenga acceso a esta habitación.' },
  restricted: { label: 'Solo algunas personas', hint: 'Quien lo crea, quienes aparecen, quien administra y con quien se comparta.' },
  private: { label: 'Solo yo', hint: 'Nadie más dentro de Vita, ni quien administra.' },
}
