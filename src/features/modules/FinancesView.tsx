import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { BarList } from '@/components/ui/BarList'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Panel'
import { useToday } from '@/hooks/useToday'
import { EXPENSE_CATEGORIES } from '@/modules/finance'
import { monthSummary, monthTrend } from '@/services/finance'
import { addMonths } from '@/utils/dates'
import { formatMoney, formatMonth } from '@/utils/format'
import { Block, ModuleRecords } from './shared'

const MONTHS = 6
const categoryName = (id: string) => EXPENSE_CATEGORIES.find((c) => c.value === id)?.label ?? id

export function FinancesView() {
  const { records } = useHome()
  const today = useToday()
  const [month, setMonth] = useState(today)
  const summary = useMemo(() => monthSummary(records, month), [records, month])
  const trend = useMemo(() => monthTrend(records, month, MONTHS), [records, month])
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
        {summary.categories.length === 0 ? <EmptyState title="Este mes no hay gastos registrados" /> : (
          <BarList label="Gasto por categoría" bars={summary.categories.map(({ category, spent, limit }) => ({
            key: category, label: categoryName(category), value: spent, limit, over: limit !== undefined && spent > limit,
            text: limit === undefined ? formatMoney(spent) : `${formatMoney(spent)} de ${formatMoney(limit)}`,
          }))} />
        )}
      </Block>
      <Block title="Gasto de los últimos meses">
        <BarList label="Gasto por mes" bars={trend.map((t) => ({ key: t.month, label: formatMonth(t.month), value: t.expense, text: formatMoney(t.expense) }))} />
      </Block>
      <ModuleRecords moduleId="finances" />
    </div>
  )
}

function Figure({ label, cents }: { label: string; cents: number }) {
  return <div><dt className="text-apagado">{label}</dt><dd className={`text-2xl font-bold tabular-nums ${cents < 0 ? 'text-peligro' : ''}`}>{formatMoney(cents)}</dd></div>
}
