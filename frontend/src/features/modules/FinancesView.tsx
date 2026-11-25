import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { BarList } from '@/components/ui/BarList'
import { Button } from '@/components/ui/Button'
import { useRecordEditor } from '@/features/records/editor'
import { EmptyState } from '@/components/ui/Panel'
import { useToday } from '@/hooks/useToday'
import { EXPENSE_CATEGORIES } from '@/modules/finance'
import { budgetAmounts, budgetWarning, categoryName, currentBudgets, monthSummary, monthTrend } from '@/services/finance'
import { accessTo, canDelete, canUpdate } from '@/services/permissions'
import { addMonths } from '@/utils/dates'
import { formatDate, formatMoney, formatMonth } from '@/utils/format'
import { QuarterReportBlock } from './QuarterReport'
import { Block, ModuleRecords } from './shared'

const MONTHS = 6

export function FinancesView() {
  const { actor, records } = useHome()
  const editor = useRecordEditor()
  const today = useToday()
  const [month, setMonth] = useState(today)
  const summary = useMemo(() => monthSummary(records, month), [records, month])
  const trend = useMemo(() => monthTrend(records, month, MONTHS), [records, month])
  const budgets = useMemo(() => currentBudgets(records), [records])
  const available = EXPENSE_CATEGORIES.find(({ value }) => !budgets.has(value))
  const spending = summary.categories.filter((item) => item.spent > 0)
  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={ChevronLeft} onClick={() => setMonth(addMonths(month, -1))}>Mes anterior</Button>
        <Button size="sm" icon={ChevronRight} onClick={() => setMonth(addMonths(month, 1))}>Mes siguiente</Button>
        <h3 aria-live="polite" className="text-xl font-bold">{formatMonth(month)}</h3>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
        <Figure label="Ingresos" cents={summary.income} />
        <Figure label="Gastos" cents={summary.expense} />
        <Figure label="Saldo" cents={summary.balance} />
      </dl>
      <Block title="En qué se va">
        {spending.length === 0 ? <EmptyState title="Este mes no hay gastos registrados" /> : (
          <BarList label="Gasto por categoría" bars={spending.map(({ category, spent }) => ({
            key: category, label: categoryName(category), value: spent, text: formatMoney(spent),
          }))} />
        )}
      </Block>
      <Block title="Topes de gasto" action={available && accessTo(actor, 'finances') === 'write' && (
        <Button icon={Plus} size="sm" onClick={() => editor.create('budget', { category: available.value })}>Añadir tope</Button>
      )}>
        {budgets.size === 0 ? <EmptyState title="Todavía no hay topes de gasto" /> : (
          <ul className="grid grid-cols-1 gap-3">
            {summary.categories.map((item) => {
              const { category, spent, limit } = item
              const budget = budgets.get(category)
              if (!budget || limit === undefined) return null
              const earlier = records.filter((r) => r.typeId === 'budget' && r.id !== budget.id && r.data.category === category)
              const editable = canUpdate(actor, budget)
              const warning = budgetWarning(item)
              const name = categoryName(category)
              return (
                <li key={category} className="grid min-w-0 grid-cols-1 gap-1 bg-yeso p-3 [overflow-wrap:anywhere] max-[24rem]:p-2">
                  <h4 className="font-bold">{name}</h4>
                  <p className="break-words">{budgetAmounts(spent, limit)}</p>
                  <div aria-hidden="true" className="h-3 bg-beige">
                    <div className={`h-full ${spent > limit ? 'bg-peligro' : 'bg-marino'}`} style={{ width: `${Math.min(100, spent / limit * 100)}%` }} />
                  </div>
                  {warning && <p className="font-bold">{warning}</p>}
                  <div><Button size="sm" onClick={() => editor.open(budget.id)}>{editable && !earlier.length ? 'Cambiar' : 'Ver'} tope de {name.toLowerCase()}</Button></div>
                  {editable && earlier.length > 0 && (
                    <div className="grid min-w-0 grid-cols-1 gap-1">
                      <p>Para cambiar el tope vigente, elimina antes los anteriores desde su ficha.</p>
                      {earlier.filter((r) => canDelete(actor, r)).map((r) => (
                        <div key={r.id}>
                          <Button size="sm" onClick={() => editor.open(r.id)}>Ver tope anterior de {formatMoney(Number(r.data.limit))} del {formatDate(r.updatedAt.slice(0, 10))}</Button>
                        </div>
                      ))}
                      {earlier.some((r) => !canDelete(actor, r)) && <p>Pide a quien administra el hogar que revise los topes anteriores.</p>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Block>
      <Block title="Informe trimestral"><QuarterReportBlock /></Block>
      <Block title="Gasto de los últimos meses">
        <BarList label="Gasto por mes" bars={trend.map((t) => ({ key: t.month, label: formatMonth(t.month), value: t.expense, text: formatMoney(t.expense) }))} />
      </Block>
      <ModuleRecords moduleId="finances" types={['transaction']} />
    </div>
  )
}

function Figure({ label, cents }: { label: string; cents: number }) {
  return <div><dt className="text-apagado">{label}</dt><dd className={`text-2xl font-bold tabular-nums ${cents < 0 ? 'text-peligro' : ''}`}>{formatMoney(cents)}</dd></div>
}
