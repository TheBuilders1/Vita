import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Checkbox, RadioGroup, TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { useToday } from '@/hooks/useToday'
import { describeError } from '@/services/errors'
import { memberInputSchema, NEEDS, type Member, type MemberInput } from '@/types/family'
import { formatDate } from '@/utils/format'
import { prepareMemberPhoto } from '@/utils/photo'
import { NEED_LABELS, ROLE_LABELS, ROLE_OPTIONS } from './labels'

interface ProfileFormProps {
  member?: Member
  /** full: todo · own: solo los datos personales · none: solo lectura. */
  scope: 'full' | 'own' | 'none'
  submitLabel: string
  onSave: (input: MemberInput) => Promise<void>
}

export function ProfileForm({ member, scope, submitLabel, onSave }: ProfileFormProps) {
  const today = useToday()
  const schema = useMemo(() => memberInputSchema(today), [today])
  const [failure, setFailure] = useState<string>()
  const [photo, setPhoto] = useState(member?.photo)
  const [photoError, setPhotoError] = useState<string>()
  const [preparingPhoto, setPreparingPhoto] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)
  const photoButton = useRef<HTMLButtonElement>(null)
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: member?.name ?? '', birthDate: member?.birthDate ?? '', relationship: member?.relationship ?? '',
      role: member?.role ?? 'member', needs: member?.needs ?? [], moduleAccess: member?.moduleAccess ?? {},
    },
  })
  const name = useWatch({ control, name: 'name' })

  if (member && scope === 'none') {
    return (
      <dl className="grid grid-cols-1 gap-3">
        <div><dt className="font-bold">Parentesco</dt><dd>{member.relationship}</dd></div>
        <div><dt className="font-bold">Nacimiento</dt><dd>{formatDate(member.birthDate)}</dd></div>
        <div><dt className="font-bold">Rol</dt><dd>{ROLE_LABELS[member.role]}</dd></div>
      </dl>
    )
  }
  const loadPhoto = async (file: File) => {
    setPhotoError(undefined)
    setPreparingPhoto(true)
    try { setPhoto(await prepareMemberPhoto(file)) } catch (error) { setPhotoError(describeError(error)) }
    finally { setPreparingPhoto(false) }
  }
  const submit = handleSubmit(async (input) => {
    if (preparingPhoto) return
    setFailure(undefined)
    try { await onSave({ ...input, photo }) } catch (error) { setFailure(describeError(error)) }
  })
  return (
    <form noValidate onSubmit={(e) => { void submit(e) }} className="grid grid-cols-1 gap-5">
      <fieldset className="min-w-0">
        <legend className="mb-1.5 font-bold">Foto del perfil</legend>
        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={name} photo={photo} />
          <input ref={photoInput} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => {
            const file = e.currentTarget.files?.[0]
            e.currentTarget.value = ''
            if (file && !preparingPhoto && !isSubmitting) void loadPhoto(file)
          }} />
          <Button ref={photoButton} size="sm" aria-disabled={preparingPhoto || isSubmitting} onClick={() => {
            if (!preparingPhoto && !isSubmitting) photoInput.current?.click()
          }}>{photo ? 'Cambiar foto' : 'Elegir foto'}</Button>
          {photo && <Button size="sm" disabled={preparingPhoto || isSubmitting} onClick={() => {
            setPhoto(undefined)
            setPhotoError(undefined)
            photoButton.current?.focus()
          }}>Quitar foto</Button>}
        </div>
        <p className="mt-2 text-sm text-apagado">La foto se guarda solo en este dispositivo y se incluye en la copia que guardes.</p>
        <div role="status">{preparingPhoto && 'Preparando la foto…'}</div>
        <div role="alert">{photoError && <Notice tone="error">{photoError}</Notice>}</div>
      </fieldset>
      <TextInput label="Nombre" required autoComplete="off" error={errors.name?.message} {...register('name')} />
      <TextInput label="Parentesco" required autoComplete="off" error={errors.relationship?.message} {...register('relationship')} />
      <TextInput label="Fecha de nacimiento" required type="date" max={today} className="min-w-0 max-[24rem]:px-2" error={errors.birthDate?.message} {...register('birthDate')} />
      {scope === 'full' && (
        <>
          <Controller control={control} name="role" render={({ field }) => <RadioGroup legend="Rol" name="role" value={field.value} options={ROLE_OPTIONS} onChange={field.onChange} />} />
          <Controller control={control} name="needs" render={({ field: { value = [], onChange } }) => (
            <fieldset className="min-w-0">
              <legend className="mb-1.5 font-bold">Qué debemos tener en cuenta</legend>
              {NEEDS.map((need) => <Checkbox key={need} label={NEED_LABELS[need]} checked={value.includes(need)} onChange={(e) => onChange(e.target.checked ? [...value, need] : value.filter((n) => n !== need))} />)}
            </fieldset>
          )} />
        </>
      )}
      <div role="alert">{failure && <Notice tone="error">{failure}</Notice>}</div>
      <div><Button type="submit" variant="primary" disabled={isSubmitting || preparingPhoto}>{submitLabel}</Button></div>
    </form>
  )
}
