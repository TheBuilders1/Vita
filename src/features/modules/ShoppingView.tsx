import { Check, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/Panel'
import { Tabs } from '@/components/ui/Tabs'
import { repositories } from '@/database'
import { useRecordEditor } from '@/features/records/editor'
import { useCanCreate } from '@/features/records/RecordList'
import { getRecordType } from '@/modules/registry'
import { describeError } from '@/services/errors'
import { canComplete } from '@/services/permissions'
import { toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'
import { formatMoney } from '@/utils/format'
import { useRecords } from './shared'

const fail = (error: unknown) => toastStore.getState().show(describeError(error), 'error')

export function ShoppingView() {
  const lists = useRecords('shoppingList')
  const editor = useRecordEditor()
  const canAdd = useCanCreate(getRecordType('shoppingList'))
  const [chosen, setChosen] = useState('')
  const list = lists.find((l) => l.id === chosen) ?? lists[0]
  const addList = canAdd && <Button size="sm" icon={Plus} onClick={() => editor.create('shoppingList')}>Añadir lista</Button>
  if (!list) return <EmptyState title="Aún no hay ninguna lista" action={addList} />
  return (
    <div className="grid grid-cols-1 gap-4">
      {lists.length > 1 && <Tabs label="Listas" value={list.id} options={lists.map((l) => ({ value: l.id, label: String(l.data.name) }))} onChange={setChosen} />}
      <ShoppingList key={list.id} list={list} />
      <div className="flex flex-wrap gap-2">{addList}<Button size="sm" onClick={() => editor.open(list.id)}>Opciones de la lista</Button></div>
    </div>
  )
}

function ShoppingList({ list }: { list: FamilyRecord }) {
  const { actor } = useHome()
  const canAdd = useCanCreate(getRecordType('shoppingItem'))
  const items = useRecords('shoppingItem').filter((i) => i.data.list === list.id)
  const [pending, bought] = [items.filter((i) => !i.data.bought), items.filter((i) => i.data.bought)]
  const total = items.reduce((sum, i) => sum + Number(i.data.price ?? 0), 0)
  const budget = list.data.budget as number | undefined
  const [name, setName] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    repositories.records.create(actor.id, { typeId: 'shoppingItem', data: { list: list.id, name } }).then(() => setName('')).catch(fail)
  }
  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="text-lg"><strong>{String(list.data.name)}.</strong> {pending.length === 0 ? 'Todo comprado.' : `Faltan ${pending.length}.`}{total > 0 && ` Con precio: ${formatMoney(total)}${budget ? ` de ${formatMoney(budget)}` : ''}.`}</p>
      {canAdd && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1"><TextInput label="Añadir producto" required autoComplete="off" enterKeyHint="done" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <Button type="submit" variant="primary" icon={Plus}>Añadir</Button>
        </form>
      )}
      <ul className="border-t-2 border-beige">{[...pending, ...bought].map((i) => <Item key={i.id} item={i} />)}</ul>
    </div>
  )
}

function Item({ item }: { item: FamilyRecord }) {
  const { actor } = useHome()
  const editor = useRecordEditor()
  const bought = Boolean(item.data.bought)
  const amount = [item.data.quantity, item.data.unit].filter(Boolean).join(' ')
  return (
    <li className="flex items-center gap-1 border-b-2 border-beige">
      <button type="button" aria-pressed={bought} disabled={!canComplete(actor, item)} onClick={() => { repositories.records.setDone(actor.id, item.id, !bought).catch(fail) }} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 px-1 text-left focus-visible:outline-offset-[-3px]">
        <span className={`grid size-8 shrink-0 place-items-center border-2 ${bought ? 'border-oliva bg-oliva text-crema' : 'border-borde bg-crema'}`}>{bought && <Check aria-hidden="true" className="size-6" />}</span>
        <span className={bought ? 'text-apagado line-through' : 'font-bold'}><span className="sr-only">Comprado: </span>{String(item.data.name)}{amount && <span className="font-normal">, {amount}</span>}</span>
      </button>
      <button type="button" onClick={() => editor.open(item.id)} className="min-h-11 px-3 underline underline-offset-4">Ver<span className="sr-only"> {String(item.data.name)}</span></button>
    </li>
  )
}
