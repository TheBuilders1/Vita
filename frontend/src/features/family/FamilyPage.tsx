import { UserPlus } from 'lucide-react'
import { Link } from 'react-router'
import { useHome } from '@/app/providers/home'
import { PageHeader } from '@/components/layout/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Notice'
import { Panel } from '@/components/ui/Panel'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import { canManage } from '@/services/permissions'
import type { Member } from '@/types/family'
import { ageOn } from '@/utils/dates'
import { ageText, NEED_LABELS, ROLE_LABELS, ROLE_OPTIONS } from './labels'

export function FamilyPage() {
  const { family, members, actor, records } = useHome()
  const pets = records.filter((r) => r.typeId === 'pet')
  useTitle('Mi hogar')
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6">
      <PageHeader
        title={family.name}
        description={`Sois ${members.length} ${members.length === 1 ? 'persona' : 'personas'} en este hogar.`}
        action={canManage(actor, 'family') && <ButtonLink to="/hogar/nuevo" variant="primary" icon={UserPlus}>Añadir integrante</ButtonLink>}
      />
      <ul className="bg-crema shadow-panel">{members.map((m) => <MemberRow key={m.id} member={m} isActor={m.id === actor.id} />)}</ul>
      {pets.length > 0 && (
        <Panel title="Mascotas">
          <ul>{pets.map((p) => <li key={p.id}><strong>{String(p.data.name)}</strong>, {String(p.data.species).toLowerCase()}</li>)}</ul>
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

function MemberRow({ member, isActor }: { member: Member; isActor: boolean }) {
  const today = useToday()
  return (
    <li className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-beige p-5 last:border-0">
      <span aria-hidden="true" className="pixel-edge grid size-14 place-items-center bg-beige text-2xl font-bold">{member.name.charAt(0).toUpperCase()}</span>
      <div className="min-w-0 flex-1 basis-40">
        <h2 className="text-xl font-bold">{member.name}{isActor && <span className="font-normal text-apagado"> (perfil activo)</span>}</h2>
        <p>{member.relationship}, {ageText(ageOn(member.birthDate, today))}. {ROLE_LABELS[member.role]}.</p>
        {member.needs.length > 0 && <p className="text-apagado">{member.needs.map((n) => NEED_LABELS[n]).join('. ')}.</p>}
      </div>
      <ButtonLink to={`/hogar/${member.id}`}>Ver perfil<span className="sr-only"> de {member.name}</span></ButtonLink>
    </li>
  )
}
