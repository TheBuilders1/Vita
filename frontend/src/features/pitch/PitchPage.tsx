import { Check, ChevronDown, Maximize, Pause, Play, WifiOff } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { Logo } from '@/components/layout/Logo'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useTitle } from '@/hooks/useTitle'
import { MODULES } from '@/modules/registry'
import { buildAgenda } from '@/services/agenda'
import { answer } from '@/services/chat'
import { budgetWarning, categoryName, monthSummary } from '@/services/finance'
import { rankRecipes } from '@/services/recipes'
import { BuildingView } from '@/three/scene/BuildingView'
import { addDays } from '@/utils/dates'
import { formatDay, formatMoney } from '@/utils/format'
import { CHAPTERS, type Chapter } from './chapters'
import { usePitchHome, type PitchHome } from './pitchHome'

const FLOOR_ROOMS = MODULES.filter((m) => m.floor !== null)
const ignore = () => {}
/** Tiempo de cada capítulo al reproducir: unos tres minutos en total. */
const STEP_MS = 15_000
const SKY: Record<Chapter['sky'], string> = { dawn: 'bg-[#f3dcc0]', day: 'bg-[#dbe6ea]', dusk: 'bg-[#ecc7a8]', night: 'bg-[#2b3550]' }

/** Presentación pública de Vita: un día de un hogar ficticio, contado con los motores reales de la app. */
export function PitchPage() {
  useTitle('Conoce Vita')
  const home = usePitchHome()
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const sections = useRef<(HTMLElement | null)[]>([])
  const instant = useReducedMotion()
  const chapter = CHAPTERS[active]!
  // Las habitaciones se encienden según avanza el día; las de capítulos pasados quedan encendidas.
  const lit = Math.min(FLOOR_ROOMS.length, Math.round((active / 8) * FLOOR_ROOMS.length))
  const rooms = useMemo(() => FLOOR_ROOMS.map((m, i) => ({ moduleId: m.id, pending: m.id === chapter.moduleId ? 1 : 0, enabled: i < lit || m.id === chapter.moduleId })), [lit, chapter.moduleId])

  const go = (index: number) => {
    const target = Math.max(0, Math.min(CHAPTERS.length - 1, index))
    sections.current[target]?.scrollIntoView({ behavior: instant ? 'instant' : 'smooth', block: 'start' })
  }

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index))
    }, { rootMargin: '-45% 0px -45% 0px' })
    for (const section of sections.current) if (section) observer.observe(section)
    return () => observer.disconnect()
  }, [])

  // Flechas, Av Pág y espacio pasan de capítulo, salvo si el foco está en un control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('button, a, input, textarea, select, summary')) return
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); setPlaying(false); go(active + 1) }
      if (['ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); setPlaying(false); go(active - 1) }
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  })

  // Al llegar al último capítulo se para sola.
  const running = playing && active < CHAPTERS.length - 1
  const advance = useEffectEvent(() => go(active + 1))
  useEffect(() => {
    if (!running) return
    const timer = setTimeout(advance, STEP_MS)
    // Si la persona toca o desplaza, manda ella.
    const stop = () => setPlaying(false)
    addEventListener('wheel', stop, { once: true })
    addEventListener('touchstart', stop, { once: true })
    return () => { clearTimeout(timer); removeEventListener('wheel', stop); removeEventListener('touchstart', stop) }
  }, [running, active])

  return (
    <div className="min-h-dvh bg-crema text-tinta">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 bg-marino px-4 text-crema">
        <Logo className="h-9" />
        <nav aria-label="Presentación" className="flex gap-2">
          <Button size="sm" icon={running ? Pause : Play} onClick={() => { if (!running && active >= CHAPTERS.length - 1) go(0); setPlaying(!running) }}><span className="max-sm:sr-only">{running ? 'Pausar' : 'Reproducir'}</span></Button>
          <Button size="sm" icon={Maximize} onClick={() => { void document.documentElement.requestFullscreen?.().catch(ignore) }}><span className="max-sm:sr-only">Pantalla completa</span></Button>
        </nav>
      </header>
      <div className="mx-auto grid max-w-[100rem] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        <div className={`sticky top-14 z-10 h-[38dvh] transition-colors duration-1000 lg:h-[calc(100dvh-3.5rem)] ${SKY[chapter.sky]}`}>
          <BuildingView decorative stageClassName="h-full" rooms={rooms} floorId={chapter.floorId ?? (chapter.moduleId ? MODULES.find((m) => m.id === chapter.moduleId)?.floor ?? null : null)} moduleId={chapter.moduleId} hovered={null} onHover={ignore} onSelectFloor={ignore} onSelectModule={ignore} />
          {chapter.time && <p className="absolute top-3 left-4 bg-marino px-3 py-1 text-2xl font-bold text-crema tabular-nums" aria-hidden="true">{chapter.time}</p>}
        </div>
        <main id="contenido" tabIndex={-1} className="outline-none">
          {CHAPTERS.map((c, i) => (
            <section key={c.id} ref={(el) => { sections.current[i] = el }} data-index={i} aria-labelledby={`cap-${c.id}`} className="flex min-h-[85dvh] flex-col justify-center gap-4 px-5 py-12 sm:px-8">
              {c.time && <p className="text-lg font-bold text-madera">{c.time}</p>}
              {i === 0
                ? <h1 id={`cap-${c.id}`} className="text-5xl leading-tight font-bold">{c.title}</h1>
                : <h2 id={`cap-${c.id}`} className="text-4xl leading-tight font-bold">{c.title}</h2>}
              <p className="text-xl">{c.text}</p>
              <div className={i === active || instant ? 'pitch-in' : 'pitch-out'}>{home ? <Scene id={c.id} home={home} /> : <p className="text-apagado">Preparando el hogar de ejemplo…</p>}</div>
              {c.inside && <details className="border-l-4 border-beige pl-4"><summary className="min-h-11 cursor-pointer py-2 font-bold">Por dentro</summary><p>{c.inside}</p></details>}
              {i < CHAPTERS.length - 1 && <button type="button" onClick={() => go(i + 1)} className="inline-flex min-h-11 items-center gap-2 self-start font-bold underline underline-offset-4"><ChevronDown aria-hidden="true" className="size-5" />Siguiente</button>}
            </section>
          ))}
        </main>
      </div>
    </div>
  )
}

function Box({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="pixel-edge grid gap-2 bg-yeso p-4">
      {label && <p className="justify-self-start bg-aviso-fondo px-2 text-sm font-bold">{label}</p>}
      {children}
    </div>
  )
}

function Scene({ id, home }: { id: Chapter['id']; home: PitchHome }) {
  const { members, records, today } = home
  const [marta, , leo, pilar] = members
  const [taken, setTaken] = useState(false)
  const [offline, setOffline] = useState(false)
  const ofType = (type: string) => records.filter((r) => r.typeId === type)
  switch (id) {
    case 'cover':
      return <Box><p>{members.map((m) => `${m.name} (${m.relationship.toLowerCase()})`).join(' · ')}</p></Box>
    case 'kitchen': {
      const matches = rankRecipes(ofType('recipe'), ofType('foodItem').map((f) => String(f.data.name)), ofType('dietNeed')).toSorted((a, b) => b.conflicts.length - a.conflicts.length).slice(0, 3)
      return (
        <Box label="Datos del hogar de ejemplo">
          <ul className="grid gap-2">{matches.map((m) => (
            <li key={m.recipe.id}><strong>{String(m.recipe.data.title)}</strong>{m.conflicts.length > 0
              ? <span className="block font-bold text-peligro">{m.conflicts.map((c) => `${members.find((x) => x.id === c.memberId)?.name ?? 'Alguien'}: ${c.reason.toLowerCase()}`).join('. ')}</span>
              : <span className="block text-oliva">Sin avisos para nadie de casa</span>}</li>
          ))}</ul>
        </Box>
      )
    }
    case 'school': {
      const items = buildAgenda({ records, members, from: today, to: addDays(today, 7), today }).filter((i) => i.memberIds.includes(leo?.id ?? '') && !i.routine).slice(0, 4)
      return <Box label={`Agenda de ${leo?.name ?? 'Leo'}`}><ul className="grid gap-1">{items.map((i) => <li key={i.key}><strong>{i.title}</strong> · {formatDay(i.date).toLowerCase()}</li>)}</ul></Box>
    }
    case 'medication': {
      const dose = buildAgenda({ records: records.filter((r) => r.moduleId === 'medication'), members: [], from: today, to: today, today }).find((i) => i.memberIds.includes(pilar?.id ?? ''))
      return (
        <Box label="Vista sencilla de Pilar">
          <p className="text-2xl font-bold">{dose ? `${dose.title}${dose.time ? `, a las ${dose.time}` : ''}` : 'Su pastilla de la mañana'}</p>
          {taken ? <p className="text-xl font-bold text-oliva">Hecho. El aviso se ha apagado.</p>
            : <Button size="lg" variant="confirm" icon={Check} onClick={() => setTaken(true)}>Tomada</Button>}
        </Box>
      )
    }
    case 'vita': {
      if (!marta) return null
      const message = 'Apunta dentista para el martes a las 10'
      const reply = answer(message, { actor: marta, members, records, enabled: MODULES.map((m) => m.id), today, emergencyNumber: '112', canReadPhotos: false })
      const proposal = reply.kind === 'proposals' ? reply.proposals[0] : undefined
      return (
        <Box label="Respuesta real del motor de Vita">
          <p className="justify-self-end bg-marino px-4 py-2 text-crema">{message}</p>
          <p className="border-l-4 border-logo-sol bg-crema p-3">{reply.text}{proposal?.data.date ? ` ${formatDay(String(proposal.data.date))}${proposal.data.time ? `, a las ${String(proposal.data.time)}` : ''}.` : ''}</p>
          <p className="font-bold">Marta pulsa «Guardar». Hasta entonces, no se ha guardado nada.</p>
        </Box>
      )
    }
    case 'documents':
      return (
        <Box label="Simulación">
          <ol className="grid list-decimal gap-1 pl-6">
            <li>Marta hace una foto del DNI.</li>
            <li>El orquestador la pasa al agente de documentos.</li>
            <li>El agente propone: caduca el 14 de marzo.</li>
            <li>Marta lo comprueba con el documento y lo guarda.</li>
          </ol>
        </Box>
      )
    case 'finance': {
      const food = monthSummary(records, today).categories.find((c) => c.category === 'food')
      if (!food?.limit) return null
      const warning = budgetWarning(food)
      return (
        <Box label="Datos del hogar de ejemplo">
          <Progress label={categoryName('food')} value={Math.min(food.spent, food.limit)} max={food.limit} detail={`${formatMoney(food.spent)} de ${formatMoney(food.limit)}`} />
          {warning && <p className="font-bold">{warning}</p>}
        </Box>
      )
    }
    case 'emergency': {
      const contacts = ofType('emergencyContact')
      return (
        <Box label="Ficha de emergencia">
          <Button size="sm" icon={WifiOff} aria-pressed={offline} onClick={() => setOffline(!offline)}>{offline ? 'Sin conexión' : 'Quitar la conexión'}</Button>
          <ul className="grid gap-1">{contacts.map((c) => <li key={c.id}><strong>{String(c.data.name)}</strong>: {String(c.data.phone)}</li>)}</ul>
          {offline && <p className="font-bold text-oliva">Sigue todo aquí, sin red.</p>}
        </Box>
      )
    }
    case 'night': {
      const tomorrow = addDays(today, 1)
      const items = buildAgenda({ records, members, from: tomorrow, to: tomorrow, today }).filter((i) => !i.routine).slice(0, 5)
      return <Box label={`Mañana, ${formatDay(tomorrow).toLowerCase()}`}><ul className="grid gap-1">{items.map((i) => <li key={i.key}>{i.time ? `${i.time} · ` : ''}{i.title}</li>)}</ul></Box>
    }
    case 'privacy':
      return <Box><ul className="grid list-disc gap-1 pl-6"><li>Sin cuentas ni contraseñas que recordar.</li><li>Nada sale del dispositivo sin que lo pidas.</li><li>Copia de seguridad cifrada con tu contraseña, cuando quieras.</li></ul></Box>
    case 'inside':
      return null
    case 'close':
      return (
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/bienvenida?como=marta" size="lg" variant="primary">Ver un hogar de ejemplo</ButtonLink>
          <ButtonLink to="/crear" size="lg">Crear mi hogar</ButtonLink>
        </div>
      )
  }
}
