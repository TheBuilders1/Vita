import { Plus } from 'lucide-react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { useRecordEditor } from '@/features/records/editor'
import { useCanCreate } from '@/features/records/RecordList'
import { getRecordType } from '@/modules/registry'
import { goalProgress } from '@/services/finance'
import { formatDate, formatMoney } from '@/utils/format'
import { Block, ModuleRecords, useRecords } from './shared'

export function SavingsView() {
  const { records } = useHome()
  const goals = useRecords('savingsGoal')
  const editor = useRecordEditor()
  const canAdd = useCanCreate(getRecordType('savingsContribution'))
  return (
    <div className="grid grid-cols-1 gap-6">
      {goals.length > 0 && (
        <Block title="Cómo vamos">
          <ul className="grid grid-cols-1 gap-5">
            {goals.map((goal) => {
              const { saved, target, left } = goalProgress(goal, records)
              return (
                <li key={goal.id}>
                  <Progress label={String(goal.data.name)} value={saved} max={target} detail={`${formatMoney(saved)} de ${formatMoney(target)}`} />
                  <p className="mt-1">{left === 0 ? 'Objetivo conseguido.' : `Faltan ${formatMoney(left)}${goal.data.deadline ? ` hasta el ${formatDate(String(goal.data.deadline))}` : ''}.`}</p>
                  {canAdd && <div className="mt-2"><Button size="sm" icon={Plus} onClick={() => editor.create('savingsContribution', { goal: goal.id })}>Aportar<span className="sr-only"> a {String(goal.data.name)}</span></Button></div>}
                </li>
              )
            })}
          </ul>
        </Block>
      )}
      <ModuleRecords moduleId="savings" />
    </div>
  )
}
