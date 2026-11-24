import { CircleAlert } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cx } from '@/utils/cx'

interface FieldInfo { label: string; help?: string | undefined; error?: string | undefined; required?: boolean }

export const CONTROL = 'w-full min-h-12 border-2 border-borde bg-crema px-4 py-2 text-tinta placeholder:text-apagado aria-invalid:border-peligro focus-visible:outline-offset-1'

interface ControlIds { id: string; 'aria-describedby': string | undefined; 'aria-invalid': true | undefined }

export function Field({ label, help, error, required, children }: FieldInfo & { children: (ids: ControlIds) => ReactNode }) {
  const id = useId()
  const helpId = help ? `${id}-help` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block font-bold">
        {label}
        {!required && <span className="font-normal text-apagado"> (opcional)</span>}
      </label>
      {help && <p id={helpId} className="mb-1.5 text-apagado">{help}</p>}
      {children({ id, 'aria-describedby': cx(helpId, errorId) || undefined, 'aria-invalid': error ? true : undefined })}
      <FieldError id={errorId} message={error} />
    </div>
  )
}

export function FieldError({ id, message }: { id: string | undefined; message: string | undefined }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1.5 flex items-start gap-2 font-bold text-peligro">
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      {message}
    </p>
  )
}

export function TextInput({ label, help, error, required, className, ...props }: FieldInfo & ComponentProps<'input'>) {
  return (
    <Field {...{ label, help, error, required }}>
      {(ids) => <input {...props} {...ids} aria-required={required} className={cx(CONTROL, className)} />}
    </Field>
  )
}

export function TextArea({ label, help, error, required, className, rows = 4, ...props }: FieldInfo & ComponentProps<'textarea'>) {
  return (
    <Field {...{ label, help, error, required }}>
      {(ids) => <textarea {...props} {...ids} rows={rows} aria-required={required} className={cx(CONTROL, className)} />}
    </Field>
  )
}

export interface Choice { readonly value: string; readonly label: string; readonly hint?: string }

export function SelectInput({ label, help, error, required, options, empty = 'Elige una opción', className, ...props }: FieldInfo & ComponentProps<'select'> & { options: readonly Choice[]; empty?: string | null }) {
  return (
    <Field {...{ label, help, error, required }}>
      {(ids) => (
        <select {...props} {...ids} aria-required={required} className={cx(CONTROL, className)}>
          {empty !== null && <option value="">{empty}</option>}
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}
    </Field>
  )
}

export function Checkbox({ label, help, className, ...props }: { label: string; help?: string } & ComponentProps<'input'>) {
  const id = useId()
  return (
    <div className={cx('flex min-h-12 items-start gap-3', className)}>
      <input id={id} type="checkbox" aria-describedby={help ? `${id}-help` : undefined} className="mt-2 size-7 shrink-0 accent-oliva" {...props} />
      <div className="min-w-0 hyphens-auto [overflow-wrap:anywhere]">
        <label htmlFor={id} className="flex min-h-11 items-center font-bold">{label}</label>
        {help && <p id={`${id}-help`} className="text-apagado">{help}</p>}
      </div>
    </div>
  )
}

interface RadioGroupProps { legend: string; help?: string; name: string; value: string; options: readonly Choice[]; onChange: (value: string) => void }

/** Opciones a la vista en vez de desplegadas: más fáciles de comparar y de pulsar. */
export function RadioGroup({ legend, help, name, value, options, onChange }: RadioGroupProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 font-bold">{legend}</legend>
      {help && <p className="mb-2 text-apagado">{help}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-12 max-w-full items-center gap-3 border-2 border-borde bg-crema px-4 py-2 max-[24rem]:gap-2 max-[24rem]:px-2 has-checked:border-marino has-checked:bg-marino has-checked:text-crema has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-foco"
          >
            <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} className="size-5 shrink-0 accent-crema outline-none" />
            <span className="min-w-0 hyphens-auto [overflow-wrap:anywhere]"><span className="font-bold">{o.label}</span>{o.hint && <span className="block">{o.hint}</span>}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
