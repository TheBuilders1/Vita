import { useState } from 'react'
import { useHome } from '@/app/providers/home'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { SelectInput } from '@/components/ui/Field'
import { repositories } from '@/database'
import { describeError } from '@/services/errors'
import { toastStore } from '@/store'
import type { Member, Role } from '@/types/family'
import { ROLE_LABELS, ROLE_OPTIONS } from './labels'

/** Cambia el rol al elegirlo. Quitarse a uno mismo el de admin pide confirmación: después no podría recuperarlo. */
export function RoleSelect({ member }: { member: Member }) {
  const { actor } = useHome()
  const [pending, setPending] = useState<Role>()
  const [error, setError] = useState<string>()
  const save = async (role: Role) => {
    await repositories.family.updateMember(actor.id, member.id, { role })
    toastStore.getState().show(`${member.name}: ${ROLE_LABELS[role].toLowerCase()}`)
  }
  const choose = (role: Role) => {
    if (role === member.role) return
    if (member.id === actor.id) { setPending(role); return }
    save(role).catch((e: unknown) => toastStore.getState().show(describeError(e), 'error'))
  }
  return (
    <>
      <SelectInput label={`Rol de ${member.name}`} required empty={null} value={member.role} options={ROLE_OPTIONS.map(({ value, label }) => ({ value, label }))} onChange={(e) => choose(e.target.value as Role)} />
      <ConfirmDialog open={pending !== undefined} title="Dejar de administrar" confirmLabel="Dejar de administrar" error={error} onClose={() => { setPending(undefined); setError(undefined) }}
        onConfirm={() => { if (pending) save(pending).then(() => setPending(undefined)).catch((e: unknown) => setError(describeError(e))) }}>
        <p>Ya no podrás administrar las personas, los permisos ni las copias. Solo otro admin podrá devolvértelo.</p>
      </ConfirmDialog>
    </>
  )
}
