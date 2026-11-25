import { UserPlus } from 'lucide-react'
import { Link } from 'react-router'
import { useHome } from '@/app/providers/home'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Notice'
import { Panel } from '@/components/ui/Panel'
import { useRecordEditor } from '@/features/records/editor'
import { useFile } from '@/hooks/useFile'
import { telLink } from '@/utils/links'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import { canUpdate, canManage } from '@/services/permissions'
import type { Member } from '@/types/family'
import { ageOn } from '@/utils/dates'
import { ageText, NEED_LABELS, ROLE_LABELS, ROLE_OPTIONS } from './labels'
import { RoleSelect } from './RoleSelect'

export function FamilyPage() {
  const { family, members, actor, records } = useHome()
  const editor = useRecordEditor()
  const pets = records.filter((r) => r.typeId === 'pet')
  const manages = canManage(actor, 'family')
  const admins = members.filter((m) => canManage(m, 'family')).map((m) => m.name).join(', ')
  useTitle('Mi hogar')
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6">
      <PageHeader
        title={family.name}
        description={`Sois ${members.length} ${members.length === 1 ? 'persona' : 'personas'} en este hogar. ${manages ? 'Lo administras tú.' : `Lo administra: ${admins}.`}`}
        action={manages && <ButtonLink to="/hogar/nuevo" variant="primary" size="lg" icon={UserPlus}>Añadir persona</ButtonLink>}
      />
      <h2 className="text-xl font-bold">{manages ? 'Administrar perfiles' : 'Personas'}</h2>
      <ul className="bg-crema shadow-panel">{members.map((m) => <MemberRow key={m.id} member={m} isActor={m.id === actor.id} manages={manages} />)}</ul>
      {pets.length > 0 && (
        <Panel title="Mascotas">
          <ul className="grid gap-3">{pets.map((pet) => {
            const photo = Array.isArray(pet.data.photo) ? pet.data.photo[0] : undefined
            const name = String(pet.data.name)
            return (
              <li key={pet.id} className="flex flex-wrap items-center gap-3 [overflow-wrap:anywhere]">
                {typeof photo === 'string' && <PetPhoto key={photo} id={photo} />}
                <span><strong>{name}</strong>, {String(pet.data.species).toLowerCase()}</span>
                {family.enabledModules.includes('pets') && canUpdate(actor, pet) && <Button onClick={() => editor.open(pet.id)}>Cambiar datos de {name}</Button>}
              </li>
            )
          })}</ul>
          <p className="mt-3"><Link to="/planta/health/pets" className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">Ir a su habitación</Link></p>
        </Panel>
      )}
      <Panel title="Qué puede hacer cada rol">
        <dl className="grid grid-cols-1 gap-3">{ROLE_OPTIONS.map((r) => <div key={r.value}><dt className="font-bold">{r.label}</dt><dd>{r.hint}</dd></div>)}</dl>
        <div className="mt-5"><Notice>Los roles ordenan lo que ve cada perfil dentro de Vita. No protegen los datos de quien use este dispositivo.</Notice></div>
      </Panel>
    </div>
  )
}

function PetPhoto({ id }: { id: string }) {
  const { file, url } = useFile(id)
  return url && file?.mime.startsWith('image/') ? <img src={url} alt="" className="size-16 object-cover" /> : null
}

function MemberRow({ member, isActor, manages }: { member: Member; isActor: boolean; manages: boolean }) {
  const today = useToday()
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-beige p-5 last:border-0">
      <Avatar name={member.name} photo={member.photo} />
      <div className="min-w-0 flex-1 basis-40 [overflow-wrap:anywhere] max-[24rem]:basis-0">
        <h3 className="text-xl font-bold">{member.name}{isActor && <span className="font-normal text-apagado"> (perfil activo)</span>}</h3>
        <p>{member.relationship}, {ageText(ageOn(member.birthDate, today))}. {ROLE_LABELS[member.role]}.</p>
        {member.phone && <a href={telLink(member.phone)} className="inline-flex min-h-11 items-center font-bold underline underline-offset-4">{member.phone}</a>}
        {member.notes && <p className="whitespace-pre-line"><strong>Qué tener en cuenta:</strong> {member.notes}</p>}
        {member.needs.length > 0 && <p className="text-apagado">{member.needs.map((n) => NEED_LABELS[n]).join('. ')}.</p>}
      </div>
      {manages && <div className="min-w-0 max-w-full basis-56 [overflow-wrap:anywhere]"><RoleSelect member={member} /></div>}
      <ButtonLink to={`/hogar/${member.id}`}>{manages ? 'Datos y permisos' : 'Ver perfil'}<span className="sr-only"> de {member.name}</span></ButtonLink>
    </li>
  )
}
