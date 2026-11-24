import { useHome } from '@/app/providers/home'
import { Progress } from '@/components/ui/Progress'
import { kidBalance, kidGoalSaved } from '@/services/finance'
import { formatMoney } from '@/utils/format'
import { Block, ModuleRecords, useRecords } from './shared'

export function KidsMoneyView() {
  const { members, records } = useHome()
  const goals = useRecords('kidGoal')
  const kids = members.filter((m) => records.some((r) => r.moduleId === 'kidsMoney' && r.data.member === m.id))
  return (
    <div className="grid grid-cols-1 gap-6">
      {kids.map((kid) => {
        const { available, saved } = kidBalance(kid.id, records)
        return (
          <Block key={kid.id} title={kid.name}>
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-apagado">Disponible</dt><dd className="text-2xl font-bold tabular-nums">{formatMoney(available)}</dd></div>
              <div><dt className="text-apagado">Ahorrado</dt><dd className="text-2xl font-bold tabular-nums">{formatMoney(saved)}</dd></div>
            </dl>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {goals.filter((g) => g.data.member === kid.id).map((g) => {
                const own = kidGoalSaved(g.id, records)
                return <Progress key={g.id} label={String(g.data.name)} value={own} max={Number(g.data.target)} detail={`${formatMoney(own)} de ${formatMoney(Number(g.data.target))}`} />
              })}
            </div>
          </Block>
        )
      })}
      <p className="text-apagado">La paga es un recordatorio: cuando se entregue, anótala como movimiento.</p>
      <ModuleRecords moduleId="kidsMoney" />
    </div>
  )
}
