import { Check, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { SelectInput, TextInput } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/Panel'
import { useStore } from 'zustand'
import { canDictate, useDictation } from '@/hooks/useDictation'
import { SHOPPING_CATEGORIES } from '@/modules/leisure'
import { parseShopping } from '@/services/shopping'
import { db, repositories } from '@/database'
import { useRecordEditor } from '@/features/records/editor'
import { useCanCreate } from '@/features/records/RecordList'
import { getRecordType } from '@/modules/registry'
import { describeError } from '@/services/errors'
import { canComplete, canUpdate } from '@/services/permissions'
import { settingsStore, toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'
import { formatMoney } from '@/utils/format'
import { useRecords } from './shared'

const fail = (error: unknown) => toastStore.getState().show(describeError(error), 'error')

export function ShoppingView() {
  const lists = useRecords('shoppingList')
  const editor = useRecordEditor()
  const canAdd = useCanCreate(getRecordType('shoppingList'))
  const { actor } = useHome()
  const addList = canAdd && <Button size="sm" icon={Plus} onClick={() => editor.create('shoppingList')}>Añadir lista</Button>
  if (!lists.length) return <EmptyState title="Aún no hay ninguna lista" action={addList} />
  return (
    <div className="grid grid-cols-1 gap-4">
      {lists.map((list) => <ShoppingList key={actor.id + list.id} list={list} />)}
      <div>{addList}</div>
    </div>
  )
}

function ShoppingList({ list }: { list: FamilyRecord }) {
  const { actor } = useHome()
  const canAdd = useCanCreate(getRecordType('shoppingItem'))
  const editor = useRecordEditor()
  const dictation = useStore(settingsStore, (s) => s.settings.dictation)
  const items = useRecords('shoppingItem').filter((i) => i.data.list === list.id)
  const [pending, bought] = [items.filter((i) => !i.data.bought), items.filter((i) => i.data.bought)]
  const total = items.reduce((sum, i) => sum + Number(i.data.price ?? 0), 0)
  const budget = list.data.budget as number | undefined
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const voice = useDictation((text) => {
    const products = parseShopping(text)
    if (!products.length) return
    db.transaction('rw', db.members, db.records, db.files, async () => {
      for (const product of products) {
        await repositories.records.create(actor.id, { typeId: 'shoppingItem', data: { ...product, list: list.id, category } })
      }
    }).then(() => toastStore.getState().show(`Productos añadidos: ${products.length}`)).catch(fail)
  })

  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    repositories.records.create(actor.id, { typeId: 'shoppingItem', data: { list: list.id, name, category } }).then(() => setName('')).catch(fail)
  }
  return (
    <section aria-label={String(list.data.name)} className="grid grid-cols-1 gap-4 border-b-2 border-beige pb-4">
      <h3 className="break-words text-lg font-bold">{String(list.data.name)}</h3>
      <p className="text-lg">{pending.length === 0 ? 'Todo comprado.' : `Faltan ${pending.length}.`}{total > 0 && ` Con precio: ${formatMoney(total)}${budget ? ` de ${formatMoney(budget)}` : ''}.`}</p>
      {canAdd && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 grow basis-40"><TextInput label="Añadir producto" required autoComplete="off" enterKeyHint="done" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <SelectInput label="Categoría" required empty={null} value={category} options={SHOPPING_CATEGORIES} onChange={(e) => setCategory(e.target.value)} />
          <Button type="submit" variant="primary" icon={Plus}>Añadir</Button>
          {dictation !== 'off' && canDictate() && <Button onClick={() => { if (voice.listening) voice.stop(); else void voice.start(dictation === 'any') }}>{voice.listening ? 'Dejar de dictar' : 'Añadir hablando'}</Button>}
        </form>
      )}
      {voice.problem && <p role="alert">{voice.problem}</p>}
      {SHOPPING_CATEGORIES.map(({ value, label }) => {
        const group = [...pending, ...bought].filter((item) => (item.data.category ?? 'other') === value)
        return group.length > 0 && <div key={value}><h4 className="font-bold">{label}</h4>
          <ul className="border-t-2 border-beige">{group.map((i) => <Item key={i.id} item={i} />)}</ul>
        </div>
      })}
      <div><Button size="sm" onClick={() => editor.open(list.id)}>Opciones de la lista</Button></div>
    </section>
  )
}

function Item({ item }: { item: FamilyRecord }) {
  const { actor } = useHome()
  const editor = useRecordEditor()
  const bought = Boolean(item.data.bought)
  const amount = [item.data.quantity, item.data.unit].filter(Boolean).join(' ')
  return (
    <li className="flex flex-wrap items-center gap-1 border-b-2 border-beige">
      <button type="button" aria-pressed={bought} disabled={!canComplete(actor, item)} onClick={() => { repositories.records.setDone(actor.id, item.id, !bought).catch(fail) }} className="flex min-h-14 min-w-0 grow basis-32 items-center gap-3 px-1 text-left focus-visible:outline-offset-[-3px]">
        <span className={`grid size-8 shrink-0 place-items-center border-2 ${bought ? 'border-oliva bg-oliva text-crema' : 'border-borde bg-crema'}`}>{bought && <Check aria-hidden="true" className="size-6" />}</span>
        <span className={`min-w-0 break-words ${bought ? 'text-apagado line-through' : 'font-bold'}`}><span className="sr-only">Comprado: </span>{String(item.data.name)}{amount && <span className="font-normal">, {amount}</span>}</span>
      </button>
      {canUpdate(actor, item) && <Button size="sm" onClick={() => editor.edit(item.id)}>Cambiar<span className="sr-only"> {String(item.data.name)}</span></Button>}
      <button type="button" onClick={() => editor.open(item.id)} className="min-h-11 px-3 underline underline-offset-4">Ver<span className="sr-only"> {String(item.data.name)}</span></button>
    </li>
  )
}
