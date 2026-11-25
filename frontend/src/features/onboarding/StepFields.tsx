import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Checkbox, RadioGroup, TextInput } from '@/components/ui/Field'
import { Notice } from '@/components/ui/Notice'
import { NEED_LABELS, ROLE_OPTIONS } from '@/features/family/labels'
import { RelationshipInput } from './RelationshipInput'
import { PreferencesForm } from '@/features/settings/PreferencesForm'
import { ModulePicker } from '@/features/settings/ModulePicker'
import { resizeMembers, suggestModules, type Draft, type DraftMember, type StepErrors, type StepId } from '@/services/onboarding'
import { NEEDS, type Role } from '@/types/family'

interface StepProps { draft: Draft; errors: StepErrors; today: string; onChange: (changes: Partial<Draft>) => void }

export function StepFields({ step, ...props }: StepProps & { step: StepId }) {
  const { draft, errors, today, onChange } = props
  switch (step) {
    case 'name':
      return <TextInput label="Nombre del hogar" required autoComplete="off" value={draft.name} error={errors.name} help="Por ejemplo: Los Robles." onChange={(e) => onChange({ name: e.target.value })} />
    case 'you':
      return <You {...props} />
    case 'count':
      return <Count {...props} />
    case 'members':
      return (
        <People {...props} others>{(m, i, set) => (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextInput label="Nombre" required autoComplete="off" value={m.name} error={errors[`members.${i}.name`]} onChange={(e) => set({ name: e.target.value })} />
            <RelationshipInput label="Qué es en el hogar" value={m.relationship} error={errors[`members.${i}.relationship`]} onChange={(relationship) => set({ relationship })} />
          </div>
        )}</People>
      )
    case 'ages':
      return (
        <People {...props} others>{(m, i, set) => (
          <TextInput label="Fecha de nacimiento" required type="date" max={today} value={m.birthDate} error={errors[`members.${i}.birthDate`]} onChange={(e) => set({ birthDate: e.target.value })} />
        )}</People>
      )
    case 'roles':
      return (
        <div className="grid grid-cols-1 gap-5">
          <Responsibles members={draft.members} />
          <div role="alert">{errors.roles && <Notice tone="error">{errors.roles}</Notice>}</div>
          <People {...props}>{(m, i, set) => (
            <RadioGroup legend="Rol" name={`role-${i}`} value={m.role} options={ROLE_OPTIONS} onChange={(role) => set({ role: role as Role })} />
          )}</People>
        </div>
      )
    case 'needs':
      return (
        <div className="grid grid-cols-1 gap-5">
          <People {...props}>{(m, _i, set) => (
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {NEEDS.map((need) => (
                <Checkbox key={need} label={NEED_LABELS[need]} checked={m.needs.includes(need)} onChange={(e) => set({ needs: e.target.checked ? [...m.needs, need] : m.needs.filter((n) => n !== need) })} />
              ))}
            </div>
          )}</People>
          <Checkbox label="Tenemos mascotas" checked={draft.hasPets} onChange={(e) => onChange({ hasPets: e.target.checked })} />
        </div>
      )
    case 'modules': {
      const suggestions = suggestModules(draft, today)
      return (
        <div className="grid grid-cols-1 gap-5">
          <p>Hemos abierto las que encajan con vuestras respuestas. Podrás cambiarlas cuando quieras.</p>
          <ModulePicker enabled={draft.modules ?? [...suggestions.keys()]} reasons={suggestions} onChange={(modules) => onChange({ modules })} />
        </div>
      )
    }
    case 'look':
      return <PreferencesForm />
  }
}

function You({ draft, errors, today, onChange }: StepProps) {
  const [you, ...others] = draft.members
  if (!you) return null
  const set = (changes: Partial<DraftMember>) => onChange({ members: [{ ...you, ...changes }, ...others] })
  // Vivir solo deja el hogar en una persona, que lo administra.
  const live = (alone: boolean, relationship: string) => onChange(alone ? { alone, members: resizeMembers([{ ...you, relationship, role: 'master' }], 1) } : { alone, members: [{ ...you, relationship }, ...others] })
  return (
    <div className="grid grid-cols-1 gap-4">
      <TextInput label="Tu nombre" required autoComplete="off" value={you.name} error={errors['members.0.name']} onChange={(e) => set({ name: e.target.value })} />
      <RelationshipInput label="Qué eres en tu hogar" value={you.relationship} error={errors['members.0.relationship']} onChange={(relationship) => set({ relationship })} alone={{ checked: draft.alone, onChange: live }} />
      <TextInput label="Tu fecha de nacimiento" required type="date" max={today} value={you.birthDate} error={errors['members.0.birthDate']} onChange={(e) => set({ birthDate: e.target.value })} />
      {draft.alone
        ? <Notice>Vita será tu casa organizada: citas, medicación, papeles, compras y a quién avisar si pasa algo. Te recomendamos apuntar al menos un contacto de emergencia. Si un día alguien se suma, lo añades desde «Mi hogar».</Notice>
        : <p>Serás quien administra el hogar. Con esto ya puedes entrar; lo demás se completa ahora o cuando quieras.</p>}
    </div>
  )
}

function Count({ draft, onChange }: StepProps) {
  const set = (count: number) => onChange({ members: resizeMembers(draft.members, count) })
  const count = draft.members.length
  return (
    <div>
      <p className="mb-4">Cuenta a quienes compartís la organización, aunque no viváis juntos. Las mascotas van aparte.</p>
      <div className="flex flex-wrap items-center gap-4">
        <Button icon={Minus} disabled={count === 1} onClick={() => set(count - 1)}>Quitar una</Button>
        <output aria-label="Número de personas" className="min-w-14 text-center text-4xl font-bold tabular-nums">{count}</output>
        <Button icon={Plus} disabled={count === 12} onClick={() => set(count + 1)}>Añadir una</Button>
      </div>
    </div>
  )
}

function People({ draft, onChange, others = false, children }: StepProps & { others?: boolean; children: (member: DraftMember, index: number, set: (changes: Partial<DraftMember>) => void) => ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6">
      {draft.members.map((member, i) => (others && i === 0 ? null : (
        <fieldset key={i} className="min-w-0 border-l-4 border-beige pl-4">
          <legend className="mb-2 text-lg font-bold">{member.name.trim() || (i === 0 ? 'Tú' : `Persona ${i + 1}`)}</legend>
          {children(member, i, (changes) => onChange({ members: draft.members.map((m, j) => (j === i ? { ...m, ...changes } : m)) }))}
        </fieldset>
      )))}
    </div>
  )
}

const join = (list: string[]) => (list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} y ${list.at(-1)}`)

/** Quién manda y quién forma parte, de un vistazo y al momento. */
function Responsibles({ members }: { members: readonly DraftMember[] }) {
  const names = (list: readonly DraftMember[]) => list.map((m, i) => m.name.trim() || `Persona ${members.indexOf(m) + 1 || i + 1}`)
  const responsible = names(members.filter((m) => m.role === 'master'))
  const others = names(members.filter((m) => m.role !== 'master'))
  return (
    <div aria-live="polite" className="border-l-4 border-oliva bg-exito-fondo p-4">
      <p><strong>{responsible.length === 1 ? 'Responsable del hogar' : 'Responsables del hogar'}:</strong> {join(responsible) || 'nadie todavía'}.</p>
      {others.length > 0 && <p><strong>{others.length === 1 ? 'Forma parte' : 'Forman parte'}:</strong> {join(others)}.</p>}
      <p className="mt-2 text-apagado">Quien es responsable (admin) añade personas, decide qué ve cada una y guarda las copias. Los demás usan Vita con lo suyo.</p>
    </div>
  )
}
