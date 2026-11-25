import { zodResolver } from '@hookform/resolvers/zod'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Notice } from '@/components/ui/Notice'
import { GUIDES } from '@/data/guides'
import { repositories } from '@/database'
import { useToday } from '@/hooks/useToday'
import type { RecordData } from '@/modules/fields'
import type { RecordTypeDef } from '@/modules/types'
import { describeError } from '@/services/errors'
import { emptyData, firstMessage } from '@/services/formData'
import { accessTo } from '@/services/permissions'
import { toastStore } from '@/store'
import type { FamilyRecord } from '@/types/records'
import { FieldControl } from './FieldControl'
import { VisibilityInput } from './VisibilityInput'

interface RecordFormProps { type: RecordTypeDef; record?: FamilyRecord; preset?: RecordData; copyOf?: FamilyRecord | undefined; onSaved?: ((data: RecordData) => void) | undefined; onClose: () => void }

export function RecordFormDialog({ type, record, preset, copyOf, onSaved, onClose }: RecordFormProps) {
  const { actor, members } = useHome()
  const today = useToday()
  const form = useRef<HTMLFormElement>(null)
  const [failure, setFailure] = useState<string>()
  const [leaving, setLeaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  // Lo que había al abrir: si alguien lo cambia entretanto, guardar lo pisaría.
  const [opened] = useState((record ?? copyOf)?.updatedAt)
  const [sharing, setSharing] = useState(() => {
    // La copia la ven las mismas personas: si no, duplicar algo reservado lo enseñaría.
    const like = record ?? copyOf
    return { visibility: like?.visibility ?? type.visibility.default, sharedWith: like?.sharedWith ?? [], touched: false }
  })

  // Quien solo puede anotar lo suyo no elige a otra persona.
  const onlySelf = accessTo(actor, type.moduleId) !== 'write'
  const people = onlySelf ? members.filter((m) => m.id === actor.id) : members
  const initial = { ...emptyData(type, today), ...(onlySelf && { member: actor.id }), ...preset, ...record?.data }
  const { control, handleSubmit, formState: { errors, isDirty, isSubmitting } } = useForm<RecordData>({
    resolver: zodResolver(type.schema as never) as unknown as Resolver<RecordData>,
    defaultValues: initial,
  })
  const member: unknown = useWatch({ control, name: 'member' })

  const save = async (data: RecordData) => {
    // Con Intro se puede enviar aunque el botón esté desactivado.
    if (uploading) return
    setFailure(undefined)
    // Sin tocarlo no se envía: quien lo abrió antes desharía un cambio de privacidad de otra persona.
    const access = sharing.touched ? { visibility: sharing.visibility, sharedWith: sharing.sharedWith } : {}
    try {
      if (record) await repositories.records.update(actor.id, record.id, { data, ...access, ...(opened && { ifUnchanged: opened }) })
      else await repositories.records.create(actor.id, { typeId: type.id, data, ...access, ...(copyOf && { copyOf: copyOf.id, ...(sharing.touched && opened && { ifUnchanged: opened }) }) })
      toastStore.getState().show(`Guardado: ${type.name.toLowerCase()}`)
      if (!record) onSaved?.(data)
      onClose()
    } catch (error) {
      setFailure(describeError(error))
    }
  }
  const focusFirstError = () => requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
  const unsaved = isDirty || sharing.touched || uploading
  const requestClose = () => { if (unsaved) setLeaving(true); else onClose() }

  // Recargar o cerrar la pestaña también perdería lo escrito.
  useEffect(() => {
    if (!unsaved) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [unsaved])

  return (
    <Dialog
      open
      onClose={requestClose}
      title={`${record ? 'Cambiar' : copyOf ? 'Duplicar' : 'Añadir'} ${type.name.toLowerCase()}`}
      error={failure}
      // Las claves impiden que React recicle «Seguir editando» como botón de envío en pleno clic: guardaría sin querer.
      footer={leaving ? (
        <Fragment key="leaving">
          <p className="mr-auto self-center font-bold">Hay cambios sin guardar</p>
          <Button onClick={() => setLeaving(false)}>Seguir editando</Button>
          <Button variant="danger" onClick={onClose}>Descartar cambios</Button>
        </Fragment>
      ) : (
        <Fragment key="editing">
          <Button onClick={requestClose}>Cancelar</Button>
          <Button type="submit" form="record-form" variant="primary" disabled={isSubmitting || uploading}>{uploading ? 'Guardando archivos…' : 'Guardar'}</Button>
        </Fragment>
      )}
    >
      <form id="record-form" ref={form} noValidate onSubmit={(e) => { void handleSubmit(save, focusFirstError)(e) }} className="grid grid-cols-1 gap-5">
        {copyOf && <Notice>Es una copia. Cambia lo que haga falta y guárdala: el original no se toca.</Notice>}
        {Object.entries(type.fields).filter(([, field]) => !field.hidden).map(([name, field]) => (
          <Controller key={name} control={control} name={name} render={({ field: { value, onChange, ref } }) => (
            <FieldControl field={field} value={value} error={firstMessage(errors[name])} people={people} member={member} inputRef={ref} onChange={onChange} onBusy={setUploading} locked={isSubmitting} />
          )} />
        ))}
        {type.id === 'newsCheck' && <aside><h3 className="font-bold">Antes de reenviar, cinco preguntas</h3>
          <ul className="list-disc pl-6">{GUIDES.digitalInfo?.[0]?.points.map((question) => <li key={question}>{question}</li>)}</ul>
        </aside>}
        {type.visibility.locked
          ? <Notice>Lo verá todo el hogar: son datos para emergencias.</Notice>
          : <VisibilityInput value={sharing.visibility} sharedWith={sharing.sharedWith} canBePrivate={!record || record.ownerId === actor.id} onChange={(visibility, sharedWith) => setSharing({ visibility, sharedWith, touched: true })} />}
      </form>
    </Dialog>
  )
}
