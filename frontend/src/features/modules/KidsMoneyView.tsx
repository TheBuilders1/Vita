import { useHome } from '@/app/providers/home'
import { Progress } from '@/components/ui/Progress'
import { useToday } from '@/hooks/useToday'
import { activeAllowances, goalEstimate, kidBalance, kidGoalSaved, weeklyGoalSavings } from '@/services/finance'
import { formatMoney } from '@/utils/format'
import { Block, ModuleRecords, useRecords } from './shared'

export function KidsMoneyView() {
  const { members, records } = useHome()
  const today = useToday()
  const goals = useRecords('kidGoal')
  const kids = members.filter((m) => records.some((r) => r.moduleId === 'kidsMoney' && r.data.member === m.id))
  return (
    <div className="grid grid-cols-1 gap-6">
      {kids.map((kid) => {
        const { available, saved } = kidBalance(kid.id, records)
        const { weekly, monthly } = activeAllowances(kid.id, records, today)
        const pay = [weekly && `${formatMoney(weekly)} cada semana`, monthly && `${formatMoney(monthly)} cada mes`].filter(Boolean).join(' y ')
        return (
          <Block key={kid.id} title={kid.name}>
            <p className="mb-3">{kid.name} tiene {formatMoney(available)} para gastar y {formatMoney(saved)} guardados. {pay ? `Le dais ${pay}.` : 'Ahora mismo no tiene una paga apuntada.'}</p>
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-apagado">Disponible (para gastar)</dt><dd className="text-2xl font-bold tabular-nums">{formatMoney(available)}</dd></div>
              <div><dt className="text-apagado">Ahorrado (lo que ha apartado)</dt><dd className="text-2xl font-bold tabular-nums">{formatMoney(saved)}</dd></div>
            </dl>
            <div className="mt-3 grid grid-cols-1 gap-3">
              {goals.filter((g) => g.data.member === kid.id).map((g) => {
                const own = kidGoalSaved(g.id, records)
                const { left, weeks } = goalEstimate(Number(g.data.target), own, weeklyGoalSavings(g.id, records, today))
                const estimate = weeks === 1 ? 'una semana' : `unas ${weeks} semanas`
                const detail = left === 0 ? 'Ya ha alcanzado la meta.' : `Le faltan ${formatMoney(left)}.${weeks ? ` A este ritmo, tardará ${estimate}.` : ' Aún no hay ahorro reciente para calcular el plazo.'}`
                return <Progress key={g.id} label={String(g.data.name)} value={own} max={Number(g.data.target)} detail={detail} />
              })}
            </div>
            {goals.some((g) => g.data.member === kid.id) && <p className="mt-2 text-apagado">El plazo se calcula con lo que ha guardado para cada meta en las últimas cuatro semanas.</p>}
          </Block>
        )
      })}
      <p className="text-apagado">La paga es un recordatorio: cuando se entregue, anótala como movimiento.</p>
      <ModuleRecords moduleId="kidsMoney" />
    </div>
  )
}
