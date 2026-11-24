import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { useHome } from '@/app/providers/home'
import { repositories } from '@/database'
import { accessTo, canManage } from '@/services/permissions'
import { buildTips, type Tip } from '@/services/tips'
import { useToday } from './useToday'

export function useTips(): Tip[] {
  const { family, records, members, actor } = useHome()
  const today = useToday()
  const device = useLiveQuery(async () => ({ dismissed: await repositories.tips.dismissed(), lastBackup: await repositories.backup.lastExport() }), [])
  return useMemo(() => {
    // Hasta saber qué se ha descartado no se enseña nada, para que no parpadee.
    if (!device) return []
    const enabled = family.enabledModules.filter((id) => accessTo(actor, id) !== 'none')
    // La copia de seguridad solo la puede hacer quien administra los datos.
    return buildTips({ records, members, today, enabled, ...device }).filter((t) => !t.link || canManage(actor, 'data'))
  }, [device, family.enabledModules, records, members, today, actor])
}
