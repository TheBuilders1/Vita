import { useState } from 'react'
import { CONTROL, Field, TextInput } from '@/components/ui/Field'
import { ALONE, ALONE_RELATIONSHIP, isListed, OTHER, RELATIONSHIPS } from '@/data/relationships'

interface RelationshipInputProps {
  label: string
  value: string
  error: string | undefined
  onChange: (value: string) => void
  /** Solo en el primer paso: ofrece «Vivo solo o sola». */
  alone?: { checked: boolean; onChange: (alone: boolean, relationship: string) => void }
}

/** Desplegable con las formas de vivir más comunes y, si ninguna encaja, un texto libre. */
export function RelationshipInput({ label, value, error, onChange, alone }: RelationshipInputProps) {
  // «Otra» se recuerda aunque aún no se haya escrito nada.
  const [writing, setWriting] = useState(value !== '' && !isListed(value) && !(alone?.checked && value === ALONE_RELATIONSHIP))
  const selected = alone?.checked ? ALONE : writing ? OTHER : value
  const choose = (choice: string) => {
    setWriting(choice === OTHER)
    const next = choice === ALONE ? ALONE_RELATIONSHIP : choice === OTHER ? '' : choice
    // Un solo cambio: dos seguidos se pisarían.
    if (alone) alone.onChange(choice === ALONE, next)
    else onChange(next)
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      <Field label={label} error={writing ? undefined : error} required>
        {(ids) => (
          <select {...ids} aria-required value={selected} onChange={(e) => choose(e.target.value)} className={CONTROL}>
            <option value="">Elige una opción</option>
            {alone && <option value={ALONE}>{ALONE}</option>}
            {RELATIONSHIPS.map(({ group, options }) => <optgroup key={group} label={group}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</optgroup>)}
            <option value={OTHER}>{OTHER}</option>
          </select>
        )}
      </Field>
      {writing && <TextInput label="Escribe qué eres en el hogar" required autoComplete="off" value={value} error={error} help="Con tus palabras: por ejemplo, madrina o vecina que ayuda." onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
}
