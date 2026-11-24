import { Building2, CalendarDays, Phone, Settings } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { useStore } from 'zustand'
import { useHome } from '@/app/providers/home'
import { ButtonLink } from '@/components/ui/Button'
import { AgendaRow } from '@/features/calendar/AgendaRow'
import { useAttention } from '@/hooks/useAttention'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import type { AgendaItem } from '@/services/agenda'
import { settingsStore } from '@/store'
import { formatDay } from '@/utils/format'
import { telLink } from '@/utils/links'

/** Portada del perfil vulnerable: lo suyo de hoy, a quién llamar y poco más. */
export function SimpleHome() {
  const { actor, records } = useHome()
  const today = useToday()
  const attention = useAttention()
  const emergencyNumber = useStore(settingsStore, (s) => s.settings.emergencyNumber)
  useTitle('Inicio')

  const mine = useMemo(() => attention.filter(({ item }) => item.memberIds.length === 0 || item.memberIds.includes(actor.id)), [attention, actor.id])
  const on = (...whens: string[]) => mine.filter((i) => whens.includes(i.when)).map((i) => i.item)
  const contacts = records
    .filter((r) => r.typeId === 'emergencyContact')
    .toSorted((a, b) => Number(a.data.priority ?? 99) - Number(b.data.priority ?? 99))

  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-8 py-4">
      <header>
        <h1 className="text-4xl font-bold">Hola, {actor.name}</h1>
        <p className="mt-1 text-2xl">{formatDay(today)}</p>
      </header>
      <Section title="Hoy" items={on('today')} empty="Hoy no tienes nada pendiente." />
      <Section title="Mañana" items={on('tomorrow')} />
      <section aria-labelledby="call-title">
        <h2 id="call-title" className="mb-3 text-2xl font-bold">Llamar</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {contacts.map((c) => <CallLink key={c.id} name={String(c.data.name)} phone={String(c.data.phone)} />)}
          <CallLink name="Emergencias" phone={emergencyNumber} danger />
        </div>
      </section>
      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/calendario" size="lg" icon={CalendarDays}>Mi calendario</ButtonLink>
        <ButtonLink to="/edificio" size="lg" icon={Building2}>Ver la casa</ButtonLink>
      </div>
      <Link to="/ajustes" className="inline-flex min-h-12 items-center gap-2 font-bold underline underline-offset-4"><Settings aria-hidden="true" className="size-6" />Cambiar el tamaño del texto</Link>
    </div>
  )
}

function Section({ title, items, empty }: { title: string; items: readonly AgendaItem[]; empty?: string }) {
  if (items.length === 0 && !empty) return null
  return (
    <section aria-label={title}>
      <h2 className="mb-3 text-2xl font-bold">{title}</h2>
      {items.length === 0
        ? <p className="bg-crema p-5 text-xl">{empty}</p>
        : <ul className="grid grid-cols-1 gap-3">{items.map((item) => <AgendaRow key={item.key} item={item} size="lg" />)}</ul>}
    </section>
  )
}

function CallLink({ name, phone, danger = false }: { name: string; phone: string; danger?: boolean }) {
  return (
    <a href={telLink(phone)} className={`pixel-edge flex min-h-20 items-center gap-4 px-5 py-3 text-xl font-bold ${danger ? 'bg-peligro text-crema [--edge:var(--color-peligro-hondo)]' : 'bg-crema'}`}>
      <Phone aria-hidden="true" className="size-8 shrink-0" />
      <span className="leading-tight">{name}<span className="block font-normal tabular-nums">{phone}</span></span>
    </a>
  )
}
