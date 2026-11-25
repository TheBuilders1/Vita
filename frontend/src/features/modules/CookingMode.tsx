import { ChefHat, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { ListenButton } from '@/components/ui/ListenButton'
import type { FamilyRecord } from '@/types/records'
import { recipeSteps } from '@/services/recipes'

/** Un paso cada vez, con letra enorme y la pantalla encendida: las manos están ocupadas. */
export function CookingMode({ recipe }: { recipe: FamilyRecord }) {
  const steps = recipeSteps(recipe.data.steps)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!open) return
    let lock: WakeLockSentinel | undefined
    // Si el navegador no deja mantener la pantalla encendida, se cocina igual.
    navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => undefined)
    return () => { void lock?.release() }
  }, [open])
  if (steps.length === 0) return null
  const title = String(recipe.data.title)
  return (
    <>
      <Button size="sm" icon={ChefHat} onClick={() => { setStep(0); setOpen(true) }}>Modo cocina<span className="sr-only">: {title}</span></Button>
      <Dialog open={open} wide title={title} onClose={() => setOpen(false)} footer={
        <>
          <Button size="lg" icon={ChevronLeft} disabled={step === 0} onClick={() => setStep(step - 1)}>Anterior</Button>
          {step < steps.length - 1
            ? <Button size="lg" variant="primary" icon={ChevronRight} onClick={() => setStep(step + 1)}>Siguiente</Button>
            : <Button size="lg" variant="confirm" onClick={() => setOpen(false)}>Terminar</Button>}
        </>
      }>
        <p className="text-xl text-apagado" aria-live="polite">Paso {step + 1} de {steps.length}</p>
        <p className="mt-4 text-4xl leading-snug font-bold max-sm:text-3xl">{steps[step]}</p>
        <div className="mt-6"><ListenButton size="lg" label="Leer este paso" text={() => steps[step] ?? ''} /></div>
      </Dialog>
    </>
  )
}
