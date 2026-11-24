import { useMemo } from 'react'
import { useHome } from '@/app/providers/home'
import { buildAttention } from '@/services/attention'
import { useToday } from './useToday'

/** Lo que merece la atención del perfil activo, sin las habitaciones apagadas. */
export function useAttention() {
  const { family, records, members } = useHome()
  const today = useToday()
  return useMemo(() => {
    const enabled = new Set(family.enabledModules)
    return buildAttention({ records: records.filter((r) => enabled.has(r.moduleId)), members, today })
  }, [family.enabledModules, records, members, today])
}
