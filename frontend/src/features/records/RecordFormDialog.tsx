import { zodResolver } from '@hookform/resolvers/zod'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { useHome } from '@/app/providers/home'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Notice } from '@/components/ui/Notice'
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

interface RecordFormProps { type: RecordTypeDef; record?: FamilyRecord; preset?: RecordData; onClose: () => void }

export function RecordFormDialog({ type, record, preset, onClose }: RecordFormProps) {
  const { actor, members } = useHome()
  const today = useToday()
  const form = useRef<HTMLFormElement>(null)
  const [failure, setFailure] = useState<string>()
  const [leaving, setLeaving] = useState(false)
  const [sharing, setSharing] = useState({ visibility: record?.visibility ?? type.visibility.default, sharedWith: record?.sharedWith ?? [], touched: false })

  // Quien solo puede anotar lo suyo no elige a otra persona.
  const onlySelf = accessTo(actor, type.moduleId) !== 'write'
  const people = onlySelf ? members.filter((m) => m.id === actor.id) : members
  const initial = { ...emptyData(type, today), ...(onlySelf && { member: actor.id }), ...preset, ...record?.data }
  const { control, handleSubmit, formState: { errors, isDirty, isSubmitting } } = useForm<RecordData>({
    resolver: zodResolver(type.schema as never) as unknown as Resolver<RecordData>,
    defaultValues: initial,
  })

  const save = async (data: RecordData) => {
    setFailure(undefined)
    const { visibility, sharedWith } = sharing
    try {
      if (record) await repositories.records.update(actor.id, record.id, { data, visibility, sharedWith })
      else await repositories.records.create(actor.id, { typeId: type.id, data, visibility, sharedWith })
      toastStore.getState().show(`Guardado: ${type.name.toLowerCase()}`)
      onClose()
    } catch (error) {
      setFailure(describeError(error))
    }
  }
  const focusFirstError = () => requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
  const unsaved = isDirty || sharing.touched
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
      title={record ? `Cambiar ${type.name.toLowerCase()}` : `Añadir ${type.name.toLowerCase()}`}
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
          <Button type="submit" form="record-form" variant="primary" disabled={isSubmitting}>Guardar</Button>
        </Fragment>
      )}
    >
      <form id="record-form" ref={form} noValidate onSubmit={(e) => { void handleSubmit(save, focusFirstError)(e) }} className="grid grid-cols-1 gap-5">
        {Object.entries(type.fields).map(([name, field]) => (
          <Controller key={name} control={control} name={name} render={({ field: { value, onChange, ref } }) => (
            <FieldControl field={field} value={value} error={firstMessage(errors[name])} people={people} inputRef={ref} onChange={onChange} />
          )} />
        ))}
        {type.visibility.locked
          ? <Notice>Lo verá todo el hogar: son datos para emergencias.</Notice>
          : <VisibilityInput value={sharing.visibility} sharedWith={sharing.sharedWith} canBePrivate={!record || record.ownerId === actor.id} onChange={(visibility, sharedWith) => setSharing({ visibility, sharedWith, touched: true })} />}
      </form>
    </Dialog>
  )
}
