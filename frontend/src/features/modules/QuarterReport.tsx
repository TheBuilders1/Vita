import { Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { DocHead } from '@/components/print/DocHead'
import { PrintSheet } from '@/components/print/PrintSheet'
import { Button } from '@/components/ui/Button'
import { SelectInput } from '@/components/ui/Field'
import { useToday } from '@/hooks/useToday'
import { categoryName, monthLabel, quarterReport, type QuarterReport as Report } from '@/services/finance'
import { addMonths, todayIso } from '@/utils/dates'
import { formatMoney } from '@/utils/format'

/** Seis porciones como mucho: las demás se juntan en «Otros» para que el gráfico se lea. */
const SLICES = 6
const signed = (cents: number) => `${cents > 0 ? '+' : ''}${formatMoney(cents)}`

/** Elegir un trimestre e imprimir su informe con la plantilla de Vita. */
export function QuarterReportBlock() {
  const { records } = useHome()
  const today = useToday()
  // El trimestre en curso y los tres anteriores.
  const quarters = useMemo(() => [0, 3, 6, 9].map((back) => addMonths(today, -back)), [today])
  const [day, setDay] = useState(quarters[0]!)
  const [printing, setPrinting] = useState(false)
  const report = useMemo(() => quarterReport(records, day, today), [records, day, today])
  return (
    <div className="grid grid-cols-1 gap-3">
      <p>Un resumen de tres meses en una hoja: ingresos, gastos, en qué se ha ido el dinero y cómo ha ido cada mes.</p>
      <SelectInput label="Trimestre" empty={null} value={day} onChange={(e) => setDay(e.target.value)}
        options={quarters.map((d) => { const r = quarterReport([], d); return { value: d, label: `${periodName(r)} (T${r.quarter})${d === quarters[0] ? ', en curso' : ''}` } })} />
      <div><Button icon={Printer} onClick={() => setPrinting(true)}>Imprimir informe trimestral</Button></div>
      {printing && <PrintSheet onDone={() => setPrinting(false)} footer={<Footer />}><ReportSheet report={report} /></PrintSheet>}
    </div>
  )
}

function periodName({ year, quarter }: Report) {
  const first = `${year}-${String(quarter * 3 - 2).padStart(2, '0')}-01`
  return `${monthLabel(first)} – ${monthLabel(addMonths(first, 2)).toLowerCase()} ${year}`
}

function ReportSheet({ report }: { report: Report }) {
  const { income, expense, balance, savingRate, months, reading } = report
  const slices = report.categories.length > SLICES
    ? [...report.categories.slice(0, SLICES - 1), { category: 'other', spent: report.categories.slice(SLICES - 1).reduce((t, c) => t + c.spent, 0), share: report.categories.slice(SLICES - 1).reduce((t, c) => t + c.share, 0) }]
    : report.categories
  return (
    <div className="doc doc-A4">
      <DocHead title="Informe financiero trimestral" subtitle={`${periodName(report)} | T${report.quarter}`} />
      <section className={`doc-hero ${balance >= 0 ? 'doc-hero-good' : 'doc-hero-bad'}`}>
        <div><span className="doc-label">Balance del trimestre</span><span className="doc-big">{signed(balance)}</span></div>
        {savingRate !== null && <div><strong>{savingRate} % de los ingresos</strong><span>Tasa de ahorro del periodo</span></div>}
      </section>
      <section className="doc-section">
        <h2><span>01</span> Resumen financiero</h2>
        <div className="doc-grid">
          <div className="doc-box"><span className="doc-label">Ingresos</span><b>{formatMoney(income)}</b></div>
          <div className="doc-box"><span className="doc-label">Gastos</span><b className="doc-bad">{formatMoney(expense)}</b></div>
          <div className="doc-box"><span className="doc-label">Ahorro neto</span><b>{formatMoney(balance)}</b></div>
        </div>
      </section>
      {slices.length > 0 && (
        <section className="doc-section">
          <h2><span>02</span> ¿En qué se ha gastado el dinero?</h2>
          <div className="doc-card doc-chart">
            <Donut slices={slices} total={expense} />
            <ul>{slices.map((s, i) => <li key={s.category}><span className={`doc-dot doc-c${i}`} />{s.category === 'other' ? 'Otros' : categoryName(s.category)}<b>{formatMoney(s.spent)} · {s.share} %</b></li>)}</ul>
          </div>
        </section>
      )}
      <section className="doc-section">
        <h2><span>{slices.length > 0 ? '03' : '02'}</span> Evolución mensual</h2>
        <div className="doc-card">
          <table className="doc-table">
            <thead><tr><th scope="col">Mes</th><th scope="col">Ingresos</th><th scope="col">Gastos</th><th scope="col">Balance</th></tr></thead>
            <tbody>{months.map((m) => <tr key={m.month}><td>{monthLabel(m.month)}</td><td>{formatMoney(m.income)}</td><td>{formatMoney(m.expense)}</td><td>{signed(m.balance)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="doc-section">
        <h2><span>{slices.length > 0 ? '04' : '03'}</span> Lectura del trimestre</h2>
        <div className="doc-reading">{reading.map((line) => <p key={line}>{line}</p>)}</div>
      </section>
    </div>
  )
}

/** Anillo con trazos: la circunferencia mide 100, así cada porción es su porcentaje. */
function Donut({ slices, total }: { slices: Report['categories']; total: number }) {
  const starts = slices.map((_, i) => slices.slice(0, i).reduce((t, s) => t + s.share, 0))
  return (
    <svg viewBox="0 0 42 42" role="img" aria-label={`Gasto total ${formatMoney(total)}`}>
      {slices.map((s, i) => (
        <circle key={s.category} className={`doc-c${i}`} cx="21" cy="21" r="15.9155" fill="none" strokeWidth="6" strokeDasharray={`${s.share} ${100 - s.share}`} strokeDashoffset={25 - starts[i]!} />
      ))}
      <text x="21" y="21" textAnchor="middle" fontSize="4.2" fontWeight="800" fill="currentColor">{formatMoney(total)}</text>
      <text x="21" y="26" textAnchor="middle" fontSize="2.6" fill="currentColor">Gasto total</text>
    </svg>
  )
}

function Footer() {
  const [year, month, day] = todayIso().split('-')
  const { family } = useHome()
  return (
    <div className="doc doc-A4"><footer className="doc-foot">
      <strong>Vita · Información financiera familiar confidencial · Generado el {day}/{month}/{year}</strong>
      <span>{family.isDemo ? 'Hogar de ejemplo con datos ficticios. ' : ''}Importes en euros. Estas cifras te ayudan a organizarte; no son asesoramiento financiero.</span>
    </footer></div>
  )
}
