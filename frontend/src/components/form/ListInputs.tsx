import { Plus, X } from 'lucide-react'
import { useState, type ReactNode, type Ref } from 'react'
import { Button } from '@/components/ui/Button'
import { CONTROL, FieldError, TextInput } from '@/components/ui/Field'
import type { Ingredient } from '@/modules/fields'
import { WEEKDAYS } from '@/utils/format'

interface ListProps<T> { label: string; help?: string | undefined; error?: string | undefined; required?: boolean; value: T[]; onChange: (value: T[]) => void }

function Group({ label, help, error, required, children }: Omit<ListProps<never>, 'value' | 'onChange'> & { children: ReactNode }) {
  return (
    <fieldset className="min-w-0" aria-invalid={error ? true : undefined} tabIndex={error ? -1 : undefined}>
      <legend className="mb-1.5 max-w-full font-bold">{label}{!required && <span className="font-normal text-apagado"> (opcional)</span>}</legend>
      {help && <p className="mb-1.5 text-apagado">{help}</p>}
      {children}
      <FieldError id={undefined} message={error} />
    </fieldset>
  )
}

/** Casillas a la vista: personas, alérgenos, días. */
export function ChoicesInput<T extends string | number>({ options, value, onChange, ...info }: ListProps<T> & { options: readonly { value: T; label: string }[] }) {
  return (
    <Group {...info}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value.includes(o.value)
          return (
            <label key={o.value} className={`flex min-h-12 items-center gap-2.5 border-2 px-3 py-1.5 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-foco ${on ? 'border-marino bg-marino text-crema' : 'border-borde bg-crema'}`}>
              <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])} className="size-5 accent-crema outline-none" />
              {o.label}
            </label>
          )
        })}
      </div>
    </Group>
  )
}

const DAYS = WEEKDAYS.map((label, i) => ({ value: i + 1, label }))
export const WeekdaysInput = (props: ListProps<number>) => <ChoicesInput {...props} options={DAYS} />

/** Textos sueltos: se añaden con Intro o con el botón. */
export function TagsInput({ value, onChange, label, ...info }: ListProps<string>) {
  const [text, setText] = useState('')
  const add = () => {
    const tag = text.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setText('')
  }
  return (
    <Group label={label} {...info}>
      <div className="flex flex-wrap gap-2">
        <input
          value={text}
          aria-label={`Añadir a ${label.toLowerCase()}`}
          className={`${CONTROL} w-auto! min-w-32 flex-1`}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          // Lo escrito sin pulsar «Añadir» también cuenta.
          onBlur={add}
        />
        <Button size="sm" icon={Plus} onClick={add}>Añadir</Button>
      </div>
      <Removable items={value.map((v) => ({ key: v, text: v }))} onRemove={(key) => onChange(value.filter((v) => v !== key))} />
    </Group>
  )
}

export function Removable({ items, onRemove }: { items: readonly { key: string; text: string }[]; onRemove: (key: string) => void }) {
  if (items.length === 0) return null
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {items.map(({ key, text }) => (
        <li key={key} className="flex items-center bg-beige pl-3">
          <span className="max-w-60 truncate">{text}</span>
          <button type="button" onClick={() => onRemove(key)} className="grid size-11 place-items-center" aria-label={`Quitar ${text}`}><X aria-hidden="true" className="size-5" /></button>
        </li>
      ))}
    </ul>
  )
}

export function TimesInput({ value, onChange, ...info }: ListProps<string>) {
  const set = (index: number, time: string) => onChange(value.map((v, i) => (i === index ? time : v)))
  return (
    <Group {...info}>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((time, i) => (
          <span key={i} className="flex items-center">
            <input type="time" aria-label={`Hora ${i + 1}`} value={time} onChange={(e) => set(i, e.target.value)} className={`${CONTROL} w-36! max-w-[60vw] px-2!`} />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-11 place-items-center" aria-label={`Quitar hora ${i + 1}`}><X aria-hidden="true" className="size-5" /></button>
          </span>
        ))}
        <Button size="sm" icon={Plus} onClick={() => onChange([...value, value.length === 0 ? '09:00' : '21:00'])}>Añadir hora</Button>
      </div>
    </Group>
  )
}

export function IngredientsInput({ value, onChange, ...info }: ListProps<Ingredient>) {
  const set = (index: number, changes: Partial<Ingredient>) => onChange(value.map((v, i) => (i === index ? { ...v, ...changes } : v)))
  return (
    <Group {...info}>
      <ul className="grid grid-cols-1 gap-3">
        {value.map((item, i) => (
          <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 border-l-4 border-beige pl-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <div className="max-sm:col-span-3"><TextInput label="Ingrediente" required value={item.name} onChange={(e) => set(i, { name: e.target.value })} /></div>
            <NumberInput label="Cantidad" required value={item.quantity} onChange={(quantity) => set(i, { quantity })} />
            <TextInput label="Unidad" required value={item.unit ?? ''} onChange={(e) => set(i, { unit: e.target.value })} />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="grid size-12 place-items-center" aria-label={`Quitar ${item.name || 'ingrediente'}`}><X aria-hidden="true" className="size-5" /></button>
          </li>
        ))}
      </ul>
      <div className="mt-2"><Button size="sm" icon={Plus} onClick={() => onChange([...value, { name: '' }])}>Añadir ingrediente</Button></div>
    </Group>
  )
}

interface NumberProps { label: string; help?: string | undefined; error?: string | undefined; required?: boolean; value: number | undefined; onChange: (value: number | undefined) => void; inputRef?: Ref<HTMLInputElement> }

/** Texto propio: admite coma decimal y no pierde lo que se está escribiendo. */
export function NumberInput({ value, onChange, inputRef, ...info }: NumberProps) {
  const [text, setText] = useState(value === undefined || Number.isNaN(value) ? '' : String(value).replace('.', ','))
  const change = (next: string) => {
    setText(next)
    const clean = next.trim().replace(',', '.')
    onChange(clean === '' ? undefined : Number(clean))
  }
  return <TextInput {...info} ref={inputRef} inputMode="decimal" autoComplete="off" value={text} onChange={(e) => change(e.target.value)} />
}

