import { ArrowLeft, ArrowRight, Flame, UserPlus } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useHomeQuery } from '@/app/providers/home'
import { Backdrop } from '@/components/backdrop/Backdrop'
import { BackLink } from '@/components/navigation/BackLink'
import { Button } from '@/components/ui/Button'
import { Notice } from '@/components/ui/Notice'
import { repositories } from '@/database'
import { useTitle } from '@/hooks/useTitle'
import { useToday } from '@/hooks/useToday'
import { describeError } from '@/services/errors'
import { firstInvalidStep, resolveStep, toSetup, validateStep, visibleSteps, type StepErrors, type StepId } from '@/services/onboarding'
import { StepFields } from './StepFields'
import { savedStep, saveStep, useDraft } from './useDraft'

const NO_ERRORS: StepErrors = {}
const address = (step: StepId) => `/crear?paso=${step}`

export function OnboardingPage() {
  const home = useHomeQuery()
  const navigate = useNavigate()
  const today = useToday()
  const { draft, update, clear } = useDraft()
  // El paso va en la dirección: recargar y «atrás» funcionan como en cualquier web.
  const [params] = useSearchParams()
  const requested = params.get('paso')
  const stepId = resolveStep(draft, requested ?? savedStep(), today)
  const [found, setFound] = useState<{ step: StepId; errors: StepErrors }>()
  const [failure, setFailure] = useState<string>()
  const [busy, setBusy] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const steps = visibleSteps(draft)
  const index = steps.findIndex((s) => s.id === stepId)
  const step = steps[index]!
  const enters = stepId === 'you' || index === steps.length - 1
  const errors = found?.step === stepId ? found.errors : NO_ERRORS
  useTitle('Crear mi hogar')

  useEffect(() => { saveStep(stepId); heading.current?.focus(); window.scrollTo(0, 0) }, [stepId, requested])
  // Tras un error, el foco va al primer dato que hay que corregir.
  useEffect(() => { if (Object.keys(errors).length > 0) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus() }, [errors])

  if (home && !busy) return <Navigate to="/" replace />
  if (requested !== stepId && !busy) return <Navigate to={address(stepId)} replace />

  const check = () => {
    const problems = validateStep(draft, stepId, today)
    setFound({ step: stepId, errors: problems })
    return Object.keys(problems).length === 0
  }
  const go = (to: StepId) => { void navigate(address(to)) }
  const finish = async () => {
    // Puede quedar algo a medias en un paso opcional: se lleva allí en vez de perderlo.
    const pending = firstInvalidStep(draft, today)
    if (pending) {
      update({ detailed: true })
      setFound({ step: pending, errors: validateStep(draft, pending, today) })
      go(pending)
      return
    }
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
    if (!check()) return
    if (enters) void finish()
    else go(steps[index + 1]!.id)
  }
  const addDetails = () => {
    if (!check()) return
    update({ detailed: true })
    go('count')
  }
  return (
    <>
    <Backdrop />
    <main id="contenido" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-8 outline-none">
      <BackLink to="/bienvenida">Salir</BackLink>
      <p className="mt-4 text-apagado">Paso {index + 1} de {steps.length}</p>
      <progress className="sr-only" aria-label="Progreso" value={index + 1} max={steps.length} />
      <div aria-hidden="true" className="mt-2 flex gap-1">
        {steps.map((s, i) => <span key={s.id} className={`h-2.5 flex-1 ${i <= index ? 'bg-marino' : 'bg-beige'}`} />)}
      </div>
      <form ref={form} noValidate onSubmit={submit} className="mt-6 bg-crema p-5 shadow-panel sm:p-8">
        <h1 ref={heading} tabIndex={-1} className="mb-5 text-3xl font-bold outline-none">{step.title}</h1>
        <StepFields step={step.id} draft={draft} errors={errors} today={today} onChange={update} />
        <div role="alert" className="mt-4">{failure && <Notice tone="error">{failure}</Notice>}</div>
        <div className="mt-8 flex flex-wrap justify-between gap-3">
          {index > 0 ? <Button icon={ArrowLeft} onClick={() => go(steps[index - 1]!.id)}>Atrás</Button> : <span />}
          <div className="flex flex-wrap gap-3">
            {stepId === 'you' && <Button icon={UserPlus} disabled={busy} onClick={addDetails}>Añadir más detalles</Button>}
            <Button type="submit" variant={enters ? 'confirm' : 'primary'} icon={enters ? Flame : ArrowRight} disabled={busy}>{enters ? 'Entrar en casa' : 'Continuar'}</Button>
          </div>
        </div>
      </form>
    </main>
    </>
  )
}
