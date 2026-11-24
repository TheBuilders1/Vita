import { ArrowLeft, ArrowRight, KeyRound } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useHomeQuery } from '@/app/providers/home'
import { Backdrop } from '@/components/backdrop/Backdrop'
import { BackLink } from '@/components/navigation/BackLink'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Notice'
import { repositories } from '@/database'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import { describeError } from '@/services/errors'
import { STEPS, toSetup, validateStep, type StepErrors } from '@/services/onboarding'
import { StepFields } from './StepFields'
import { useDraft } from './useDraft'

export function OnboardingPage() {
  const home = useHomeQuery()
  const navigate = useNavigate()
  const today = useToday()
  const { draft, update, clear } = useDraft()
  const [index, setIndex] = useState(0)
  const [errors, setErrors] = useState<StepErrors>({})
  const [failure, setFailure] = useState<string>()
  const [busy, setBusy] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const step = STEPS[index]!
  const isLast = index === STEPS.length - 1
  useTitle('Crear mi familia')

  useEffect(() => { heading.current?.focus(); window.scrollTo(0, 0) }, [index])
  // Tras un error, el foco va al primer dato que hay que corregir.
  useEffect(() => { if (Object.keys(errors).length > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus() }, [errors])

  if (home && !busy) return <Navigate to="/" replace />

  const finish = async () => {
    setBusy(true)
    try {
      const { members } = await repositories.family.setup(toSetup(draft, today))
      await repositories.session.use(members.find((m) => m.role === 'master')!.id)
      clear()
      void navigate('/')
    } catch (error) {
      setFailure(describeError(error))
      setBusy(false)
    }
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const found = validateStep(draft, step.id, today)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    if (isLast) void finish()
    else setIndex(index + 1)
  }
  return (
    <>
    <Backdrop />
    <main id="contenido" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-8 outline-none">
      <BackLink to="/bienvenida">Salir</BackLink>
      <p className="mt-4 text-apagado">Paso {index + 1} de {STEPS.length}</p>
      <progress className="sr-only" aria-label="Progreso" value={index + 1} max={STEPS.length} />
      <div aria-hidden="true" className="mt-2 flex gap-1">
        {STEPS.map((s, i) => <span key={s.id} className={`h-2.5 flex-1 ${i <= index ? 'bg-marino' : 'bg-beige'}`} />)}
      </div>
      <form ref={form} noValidate onSubmit={submit} className="mt-6 bg-crema p-5 shadow-panel sm:p-8">
        <h1 ref={heading} tabIndex={-1} className="mb-5 text-3xl font-bold outline-none">{step.title}</h1>
        <StepFields step={step.id} draft={draft} errors={errors} today={today} onChange={update} />
        <div role="alert" className="mt-4">{failure && <Notice tone="error">{failure}</Notice>}</div>
        <div className="mt-8 flex flex-wrap justify-between gap-3">
          {index > 0 ? <Button icon={ArrowLeft} onClick={() => { setErrors({}); setIndex(index - 1) }}>Atrás</Button> : <span />}
          <Button type="submit" variant={isLast ? 'confirm' : 'primary'} icon={isLast ? KeyRound : ArrowRight} disabled={busy}>{isLast ? 'Entrar en casa' : 'Continuar'}</Button>
        </div>
      </form>
    </main>
    </>
  )
}
