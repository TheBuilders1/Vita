import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useHome } from '@/app/providers/home'
import { PageHeader } from '@/components/layout/PageHeader'
import { BackLink } from '@/components/navigation/BackLink'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { Panel } from '@/components/ui/Panel'
import { repositories } from '@/database'
import type { RemovalSummary } from '@/database/repositories/removal'
import { useTitle } from '@/hooks/useTitle'
import { describeError } from '@/services/errors'
import { canManage } from '@/services/permissions'
import { toastStore } from '@/store'
import type { Member, MemberInput } from '@/types/family'
import { AccessEditor } from './AccessEditor'
import { ProfileForm } from './ProfileForm'

const back = <BackLink to="/hogar">Volver a mi hogar</BackLink>

export function NewMemberPage() {
  const { actor } = useHome()
  const navigate = useNavigate()
  useTitle('Añadir integrante')
  if (!canManage(actor, 'family')) return <Navigate to="/hogar" replace />
  const save = async (input: MemberInput) => {
    const member = await repositories.family.addMember(actor.id, input)
    toastStore.getState().show(`${member.name} ya forma parte del hogar`)
    void navigate('/hogar')
  }
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6">
      <PageHeader title="Añadir integrante" back={back} />
      <Panel><ProfileForm scope="full" submitLabel="Añadir integrante" onSave={save} /></Panel>
    </div>
  )
}

export function MemberPage() {
  const { memberId } = useParams()
  const { members, actor } = useHome()
  const member = members.find((m) => m.id === memberId)
  useTitle(member?.name)
  if (!member) return <Navigate to="/hogar" replace />
  const manages = canManage(actor, 'family')
  const own = member.id === actor.id
  const save = async (input: MemberInput) => {
    const { name, birthDate, relationship } = input
    await repositories.family.updateMember(actor.id, member.id, manages ? input : { name, birthDate, relationship })
    toastStore.getState().show('Perfil guardado')
  }
  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-6">
      <PageHeader title={member.name} back={back} />
      <Panel title="Perfil">
        <ProfileForm key={member.id} member={member} scope={manages ? 'full' : own ? 'own' : 'none'} submitLabel="Guardar perfil" onSave={save} />
      </Panel>
      {manages && member.role !== 'master' && <Panel title="Qué puede ver"><AccessEditor member={member} /></Panel>}
      {manages && !own && <RemoveMember member={member} />}
    </div>
  )
}

function RemoveMember({ member }: { member: Member }) {
  const { actor } = useHome()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<RemovalSummary>()
  const [error, setError] = useState<string>()
  const ask = () => {
    repositories.family.previewMemberRemoval(actor.id, member.id).then(setPreview)
      .catch((cause: unknown) => toastStore.getState().show(describeError(cause), 'error'))
  }
  const remove = async () => {
    try {
      await repositories.family.removeMember(actor.id, member.id)
      toastStore.getState().show(`${member.name} ya no forma parte del hogar`)
      void navigate('/hogar')
    } catch (cause) {
      setError(describeError(cause))
    }
  }
  return (
    <div>
      <Button variant="danger" icon={Trash2} onClick={ask}>Eliminar a {member.name}</Button>
      <ConfirmDialog
        open={preview !== undefined}
        onClose={() => { setPreview(undefined); setError(undefined) }}
        title={`Eliminar a ${member.name}`}
        confirmLabel={`Eliminar a ${member.name}`}
        error={error}
        onConfirm={() => { void remove() }}
      >
        {preview && <p>{removalText(preview)} No se puede deshacer.</p>}
      </ConfirmDialog>
    </div>
  )
}

function removalText({ removed, changed }: RemovalSummary): string {
  const parts = ['Se borrará su perfil.']
  if (removed > 0) parts.push(removed === 1 ? 'También un registro que trata de esta persona o es privado suyo.' : `También ${removed} registros que tratan de esta persona o son privados suyos.`)
  if (changed > 0) parts.push(changed === 1 ? 'Otro registro se conservará sin su nombre.' : `Otros ${changed} registros se conservarán sin su nombre.`)
  return parts.join(' ')
}
