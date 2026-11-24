import { ChevronLeft, ChevronRight, Plus, ShoppingBasket } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { repositories } from '@/database'
import { useRecordEditor } from '@/features/records/editor'
import { RecordList, useCanCreate } from '@/features/records/RecordList'
import { useToday } from '@/hooks/useToday'
import { getRecordType } from '@/modules/registry'
import { describeError } from '@/services/errors'
import { missingForShopping } from '@/services/recipes'
import { recordTitle, titleContext } from '@/services/titles'
import { toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'
import { addDays, weekDays } from '@/utils/dates'
import { formatDay } from '@/utils/format'
import { TabbedView, useRecords } from './shared'

export function CookingView() {
  return (
    <TabbedView label="Cocina" tabs={[
      { id: 'menu', label: 'Menú semanal', content: <WeekMenu /> },
      { id: 'recipes', label: 'Recetas', content: <RecordList type={getRecordType('recipe')} /> },
    ]} />
  )
}

const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner']

function WeekMenu() {
  const { members, records } = useHome()
  const today = useToday()
  const editor = useRecordEditor()
  const canPlan = useCanCreate(getRecordType('mealPlan'))
  const [week, setWeek] = useState(today)
  const plans = useRecords('mealPlan')
  const context = useMemo(() => titleContext(members, records), [members, records])
  const days = weekDays(week)
  const ofWeek = plans.filter((p) => days.includes(String(p.data.date)))
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" icon={ChevronLeft} onClick={() => setWeek(addDays(week, -7))}>Anterior</Button>
        <Button size="sm" onClick={() => setWeek(today)}>Esta semana</Button>
        <Button size="sm" icon={ChevronRight} onClick={() => setWeek(addDays(week, 7))}>Siguiente</Button>
      </div>
      <AddMissing plans={ofWeek} />
      <ol className="grid grid-cols-1 gap-2">
        {days.map((day) => (
          <li key={day} className={`p-3 ${day === today ? 'bg-aviso-fondo' : 'bg-yeso'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold">{formatDay(day)}</h4>
              {canPlan && <Button size="sm" icon={Plus} onClick={() => editor.create('mealPlan', { date: day })}>Añadir<span className="sr-only"> comida el {formatDay(day)}</span></Button>}
            </div>
            <ul>
              {ofWeek.filter((p) => p.data.date === day).toSorted((a, b) => MEAL_ORDER.indexOf(String(a.data.meal)) - MEAL_ORDER.indexOf(String(b.data.meal))).map((p) => (
                <li key={p.id}><button type="button" onClick={() => editor.open(p.id)} className="min-h-11 text-left underline underline-offset-4">{recordTitle(p, context)}</button></li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Del menú a la lista de la compra, sin repetir lo que ya hay o ya está apuntado. */
function AddMissing({ plans }: { plans: readonly FamilyRecord[] }) {
  const { actor, family } = useHome()
  const recipes = useRecords('recipe')
  const food = useRecords('foodItem')
  const lists = useRecords('shoppingList')
  const items = useRecords('shoppingItem')
  const canShop = useCanCreate(getRecordType('shoppingItem'))
  const [busy, setBusy] = useState(false)
  const planned = recipes.filter((r) => plans.some((p) => p.data.recipe === r.id))
  const missing = missingForShopping(planned, food.map((f) => String(f.data.name)), items.filter((i) => !i.data.bought).map((i) => String(i.data.name)))

  if (!canShop || !family.enabledModules.includes('shopping') || planned.length === 0) return null
  if (missing.length === 0) return <p>Para este menú no falta nada por comprar o apuntar.</p>

  const add = async () => {
    setBusy(true)
    const { show } = toastStore.getState()
    try {
      const list = lists[0] ?? await repositories.records.create(actor.id, { typeId: 'shoppingList', data: { name: 'Compra de casa' } })
      for (const name of missing) await repositories.records.create(actor.id, { typeId: 'shoppingItem', data: { list: list.id, name } })
      show(`Apuntado en «${String(list.data.name)}»: ${missing.join(', ').toLowerCase()}`)
    } catch (error) {
      show(describeError(error), 'error')
    }
    setBusy(false)
  }
  return (
    <div className="border-2 border-beige p-4">
      <p>Para este menú falta: <strong>{missing.join(', ').toLowerCase()}</strong></p>
      <div className="mt-2"><Button size="sm" variant="primary" icon={ShoppingBasket} disabled={busy} onClick={() => { void add() }}>Apuntar en la compra</Button></div>
    </div>
  )
}
