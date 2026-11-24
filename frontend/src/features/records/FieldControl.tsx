import type { RefCallBack } from 'react-hook-form'
import { useHome } from '@/app/providers/home'
import { FilesInput } from '@/components/form/FilesInput'
import { ChoicesInput, IngredientsInput, NumberInput, TagsInput, TimesInput, WeekdaysInput } from '@/components/form/ListInputs'
import { MoneyInput } from '@/components/form/MoneyInput'
import { Checkbox, SelectInput, TextArea, TextInput } from '@/components/ui/Field'
import type { Field, Ingredient } from '@/modules/fields'
import { recordTitle, titleContext } from '@/services/titles'
import type { Member } from '@/types/family'

interface FieldControlProps {
  field: Field
  value: unknown
  error: string | undefined
  /** Personas que se pueden elegir. */
  people: readonly Member[]
  inputRef: RefCallBack
  onChange: (value: unknown) => void
}

const list = <T,>(value: unknown) => (value ?? []) as T[]

/** Un control por tipo de campo: es todo lo que necesita un módulo nuevo para tener formulario. */
export function FieldControl({ field, value, error, people, inputRef, onChange }: FieldControlProps) {
  const { records, members } = useHome()
  const info = { label: field.label, help: field.help, error, required: field.required ?? false }
  const text = { ...info, ref: inputRef, value: String(value ?? ''), onChange: (e: { target: { value: string } }) => onChange(e.target.value) }
  const person = people.map((m) => ({ value: m.id, label: m.name }))

  switch (field.kind) {
    case 'text': return <TextInput {...text} autoComplete="off" maxLength={field.maxLength ?? 200} />
    case 'textarea': return <TextArea {...text} rows={3} />
    case 'date': return <TextInput {...text} type="date" />
    case 'time': return <TextInput {...text} type="time" />
    case 'phone': return <TextInput {...text} type="tel" autoComplete="off" />
    case 'url': return <TextInput {...text} type="url" autoComplete="off" />
    case 'money': return <MoneyInput {...info} inputRef={inputRef} value={value as number | undefined} onChange={onChange} />
    case 'number': case 'integer':
      return <NumberInput {...info} label={field.unit ? `${field.label} (${field.unit})` : field.label} inputRef={inputRef} value={value as number | undefined} onChange={onChange} />
    case 'select': return <SelectInput {...text} options={field.options} empty={field.required ? 'Elige una opción' : 'Sin indicar'} />
    case 'member': return <SelectInput {...text} options={person} empty={field.required ? 'Elige una persona' : 'Nadie en concreto'} />
    case 'record': {
      const context = titleContext(members, records)
      const options = records.filter((r) => r.typeId === field.refType).map((r) => ({ value: r.id, label: recordTitle(r, context) }))
      return <SelectInput {...text} options={options} empty={options.length === 0 ? 'Todavía no hay ninguno' : field.required ? 'Elige una opción' : 'Sin indicar'} />
    }
    case 'boolean': return <Checkbox label={field.label} {...(field.help && { help: field.help })} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
    case 'choices': return <ChoicesInput {...info} options={field.options} value={list<string>(value)} onChange={onChange} />
    case 'members': return <ChoicesInput {...info} options={person} value={list<string>(value)} onChange={onChange} />
    case 'weekdays': return <WeekdaysInput {...info} value={list<number>(value)} onChange={onChange} />
    case 'tags': return <TagsInput {...info} value={list<string>(value)} onChange={onChange} />
    case 'times': return <TimesInput {...info} value={list<string>(value)} onChange={onChange} />
    case 'ingredients': return <IngredientsInput {...info} value={list<Ingredient>(value)} onChange={onChange} />
    case 'files': return <FilesInput {...info} value={list<string>(value)} onChange={onChange} />
  }
}
